import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { CalendarClock, Edit, GraduationCap, ListChecks, Phone, Plus, Search, Trash2, UserCheck } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';

type LeadStatus = 'new' | 'contacted' | 'interested' | 'admitted' | 'lost' | 'closed';
type LeadSource = 'walkin' | 'call' | 'social' | 'website' | 'referral' | 'other';
type LeadPriority = 'low' | 'medium' | 'high';

interface LeadRecord {
    id: number;
    studentName: string;
    parentName: string | null;
    phone: string;
    email: string | null;
    source: LeadSource;
    interestedClass: string | null;
    academicYear: string | null;
    status: LeadStatus;
    priority: LeadPriority;
    preferredContactTime: string | null;
    followUpDate: string | null;
    notes: string | null;
    assignedToName: string | null;
    createdByName: string | null;
    createdAt: string | null;
}

interface StaffMember {
    id: number;
    name: string;
}

interface FilterState {
    status: string;
    source: string;
    assignedTo: string;
    search: string;
}

interface LeadsProps {
    user: any;
    leads: LeadRecord[];
    filters: FilterState;
    statuses: LeadStatus[];
    sources: LeadSource[];
    priorities: LeadPriority[];
    staffMembers: StaffMember[];
}

const statusStyles: Record<LeadStatus, string> = {
    new: 'border-blue-200 bg-blue-50 text-blue-700',
    contacted: 'border-amber-200 bg-amber-50 text-amber-700',
    interested: 'border-violet-200 bg-violet-50 text-violet-700',
    admitted: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    lost: 'border-red-200 bg-red-50 text-red-700',
    closed: 'border-slate-200 bg-slate-50 text-slate-600',
};

const sourceLabels: Record<LeadSource, string> = {
    walkin: 'Walk-In',
    call: 'Phone Call',
    social: 'Social Media',
    website: 'Website',
    referral: 'Referral',
    other: 'Other',
};

const priorityStyles: Record<LeadPriority, string> = {
    low: 'border-slate-200 bg-slate-50 text-slate-600',
    medium: 'border-amber-200 bg-amber-50 text-amber-700',
    high: 'border-red-200 bg-red-50 text-red-700',
};

const today = new Date().toISOString().slice(0, 10);

const emptyForm = {
    student_name: '',
    parent_name: '',
    phone: '',
    email: '',
    source: 'walkin' as LeadSource,
    interested_class: '',
    academic_year: '',
    status: 'new' as LeadStatus,
    priority: 'medium' as LeadPriority,
    preferred_contact_time: '',
    follow_up_date: '',
    notes: '',
    assigned_to: '',
};

export default function Leads({ user, leads, filters, statuses, sources, priorities, staffMembers }: LeadsProps) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const [showDialog, setShowDialog] = useState(false);
    const [editingLead, setEditingLead] = useState<LeadRecord | null>(null);
    const [formData, setFormData] = useState(emptyForm);
    const [processing, setProcessing] = useState(false);
    const [appliedFilters, setAppliedFilters] = useState<FilterState>({
        status: filters?.status ?? 'all',
        source: filters?.source ?? 'all',
        assignedTo: filters?.assignedTo ?? 'all',
        search: filters?.search ?? '',
    });
    const [searchQuery, setSearchQuery] = useState(filters?.search ?? '');

    useEffect(() => {
        if (flash.success) {
            toast.success(flash.success);
        }

        if (flash.error) {
            toast.error(flash.error);
        }
    }, [flash.error, flash.success]);

    const applyFilters = (patch: Partial<FilterState>) => {
        const next = { ...appliedFilters, ...patch };
        setAppliedFilters(next);
        setProcessing(true);
        router.get('/leads', next, {
            preserveState: true,
            replace: true,
            only: ['leads'],
            onFinish: () => setProcessing(false),
        });
    };

    const stats = {
        total: leads.length,
        new: leads.filter((lead) => lead.status === 'new').length,
        followUps: leads.filter(
            (lead) =>
                lead.followUpDate &&
                lead.followUpDate <= today &&
                !['admitted', 'closed', 'lost'].includes(lead.status),
        ).length,
        admitted: leads.filter((lead) => lead.status === 'admitted').length,
    };

    const resetForm = () => {
        setFormData(emptyForm);
    };

    const openCreateDialog = () => {
        setEditingLead(null);
        resetForm();
        setShowDialog(true);
    };

    const openEditDialog = (lead: LeadRecord) => {
        setEditingLead(lead);
        setFormData({
            student_name: lead.studentName,
            parent_name: lead.parentName ?? '',
            phone: lead.phone,
            email: lead.email ?? '',
            source: lead.source,
            interested_class: lead.interestedClass ?? '',
            academic_year: lead.academicYear ?? '',
            status: lead.status,
            priority: lead.priority,
            preferred_contact_time: lead.preferredContactTime ?? '',
            follow_up_date: lead.followUpDate ?? '',
            notes: lead.notes ?? '',
            assigned_to: lead.assignedToName
                ? (staffMembers.find((staff) => staff.name === lead.assignedToName)?.id ?? '')
                : '',
        });
        setShowDialog(true);
    };

    const saveLead = () => {
        if (!formData.student_name.trim() || !formData.phone.trim()) {
            toast.error('Enter the student name and phone number.');
            return;
        }

        setProcessing(true);
        const payload = {
            ...formData,
            parent_name: formData.parent_name || null,
            email: formData.email || null,
            interested_class: formData.interested_class || null,
            academic_year: formData.academic_year || null,
            preferred_contact_time: formData.preferred_contact_time || null,
            follow_up_date: formData.follow_up_date || null,
            notes: formData.notes || null,
            assigned_to: formData.assigned_to || null,
        };
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                setShowDialog(false);
                resetForm();
            },
            onError: () => toast.error(editingLead ? 'Failed to update lead.' : 'Failed to create lead.'),
            onFinish: () => setProcessing(false),
        };

        if (editingLead) {
            router.patch(`/leads/${editingLead.id}`, payload, options);
            return;
        }

        router.post('/leads', payload, options);
    };

    const deleteLead = (lead: LeadRecord) => {
        if (!window.confirm(`Delete the lead for ${lead.studentName}?`)) {
            return;
        }

        setProcessing(true);
        router.delete(`/leads/${lead.id}`, {
            preserveScroll: true,
            onError: () => toast.error('Failed to delete lead.'),
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <DashboardLayout user={user} activeTab="leads">
            <div className="min-h-full bg-slate-50 p-6">
                <div className="space-y-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{t('Admission Leads')}</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                {t('Track prospective students from enquiry to admission.')}
                            </p>
                        </div>
                        <Button onClick={openCreateDialog} className="gap-2">
                            <Plus className="h-4 w-4" />
                            {t('Add Lead')}
                        </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>{t('Total Leads')}</CardDescription>
                                <CardTitle className="text-2xl">{stats.total}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-slate-600">
                                <ListChecks className="mr-2 inline h-4 w-4" />
                                {t('All enquiries')}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>{t('New')}</CardDescription>
                                <CardTitle className="text-2xl text-blue-600">{stats.new}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-slate-600">
                                <UserCheck className="mr-2 inline h-4 w-4" />
                                {t('Awaiting first contact')}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>{t('Follow-ups Due')}</CardDescription>
                                <CardTitle className="text-2xl text-amber-600">{stats.followUps}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-slate-600">
                                <CalendarClock className="mr-2 inline h-4 w-4" />
                                {t('Urgent attention')}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>{t('Admitted')}</CardDescription>
                                <CardTitle className="text-2xl text-emerald-600">{stats.admitted}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-slate-600">
                                <GraduationCap className="mr-2 inline h-4 w-4" />
                                {t('Converted leads')}
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('Leads')}</CardTitle>
                            <CardDescription>{t('Manage, filter and convert admission leads.')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="relative min-w-[240px] flex-1">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <Input
                                        value={searchQuery}
                                        onChange={(event) => setSearchQuery(event.target.value)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter') {
                                                applyFilters({ search: searchQuery });
                                            }
                                        }}
                                        placeholder={t('Search name, phone or email...')}
                                        className="pl-10"
                                    />
                                </div>
                                <Select
                                    value={appliedFilters.status}
                                    onValueChange={(value) => applyFilters({ status: value })}
                                >
                                    <SelectTrigger className="w-36">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('All Status')}</SelectItem>
                                        {statuses.map((status) => (
                                            <SelectItem key={status} value={status}>
                                                {t(status)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select
                                    value={appliedFilters.source}
                                    onValueChange={(value) => applyFilters({ source: value })}
                                >
                                    <SelectTrigger className="w-40">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('All Sources')}</SelectItem>
                                        {sources.map((source) => (
                                            <SelectItem key={source} value={source}>
                                                {t(sourceLabels[source])}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {staffMembers.length > 0 && (
                                    <Select
                                        value={appliedFilters.assignedTo}
                                        onValueChange={(value) => applyFilters({ assignedTo: value })}
                                    >
                                        <SelectTrigger className="w-44">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('All Assignees')}</SelectItem>
                                            {staffMembers.map((staff) => (
                                                <SelectItem key={staff.id} value={String(staff.id)}>
                                                    {staff.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>

                            <div className="overflow-hidden rounded-lg border border-slate-200">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Student')}</TableHead>
                                            <TableHead>{t('Contact')}</TableHead>
                                            <TableHead>{t('Source')}</TableHead>
                                            <TableHead>{t('Class / Year')}</TableHead>
                                            <TableHead>{t('Priority')}</TableHead>
                                            <TableHead>{t('Status')}</TableHead>
                                            <TableHead>{t('Follow-up')}</TableHead>
                                            <TableHead>{t('Assigned To')}</TableHead>
                                            <TableHead className="text-right">{t('Actions')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {leads.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={9} className="h-24 text-center text-slate-500">
                                                    {t('No leads found')}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            leads.map((lead) => {
                                                const isDue =
                                                    lead.followUpDate &&
                                                    lead.followUpDate <= today &&
                                                    !['admitted', 'closed', 'lost'].includes(lead.status);

                                                return (
                                                    <TableRow key={lead.id}>
                                                        <TableCell>
                                                            <div className="font-medium text-slate-900">
                                                                {lead.studentName}
                                                            </div>
                                                            <div className="text-xs text-slate-500">
                                                                {lead.parentName ?? t('No parent name')}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-1 text-sm text-slate-700">
                                                                <Phone className="h-3.5 w-3.5 text-slate-400" />
                                                                {lead.phone}
                                                            </div>
                                                            {lead.email && (
                                                                <div className="text-xs text-slate-500">
                                                                    {lead.email}
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="secondary">
                                                                {t(sourceLabels[lead.source])}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="text-sm text-slate-700">
                                                                {lead.interestedClass ?? '-'}
                                                            </div>
                                                            <div className="text-xs text-slate-500">
                                                                {lead.academicYear ?? '-'}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                variant="outline"
                                                                className={priorityStyles[lead.priority]}
                                                            >
                                                                {t(lead.priority)}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                variant="outline"
                                                                className={statusStyles[lead.status]}
                                                            >
                                                                {t(lead.status)}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="text-sm text-slate-700">
                                                                {lead.followUpDate ?? '-'}
                                                            </div>
                                                            {isDue && (
                                                                <div className="flex items-center gap-1 text-xs font-medium text-amber-600">
                                                                    <CalendarClock className="h-3 w-3" />
                                                                    {t('Due')}
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-sm text-slate-600">
                                                            {lead.assignedToName ?? '-'}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex justify-end gap-2">
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="icon"
                                                                    disabled={processing}
                                                                    onClick={() => openEditDialog(lead)}
                                                                    className="h-8 w-8"
                                                                    title={t('Edit lead')}
                                                                    aria-label={t('Edit lead')}
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="icon"
                                                                    disabled={processing}
                                                                    onClick={() => deleteLead(lead)}
                                                                    className="h-8 w-8 border-red-200 text-red-700 hover:border-red-300 hover:text-red-800"
                                                                    title={t('Delete lead')}
                                                                    aria-label={t('Delete lead')}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Dialog open={showDialog} onOpenChange={(open) => (open ? setShowDialog(true) : setShowDialog(false))}>
                    <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>{editingLead ? t('Edit Lead') : t('Add Lead')}</DialogTitle>
                            <DialogDescription>
                                {editingLead
                                    ? t('Update the details and status of this admission lead.')
                                    : t('Capture a new admission enquiry as a lead.')}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-2 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>{t('Student Name')}</Label>
                                <Input
                                    value={formData.student_name}
                                    onChange={(event) =>
                                        setFormData((current) => ({
                                            ...current,
                                            student_name: event.target.value,
                                        }))
                                    }
                                    placeholder={t('e.g. Aarav Sharma')}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('Parent Name')}</Label>
                                <Input
                                    value={formData.parent_name}
                                    onChange={(event) =>
                                        setFormData((current) => ({
                                            ...current,
                                            parent_name: event.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('Phone')}</Label>
                                <Input
                                    value={formData.phone}
                                    onChange={(event) =>
                                        setFormData((current) => ({
                                            ...current,
                                            phone: event.target.value,
                                        }))
                                    }
                                    placeholder={t('e.g. 9876543210')}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('Email')}</Label>
                                <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={(event) =>
                                        setFormData((current) => ({
                                            ...current,
                                            email: event.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('Source')}</Label>
                                <Select
                                    value={formData.source}
                                    onValueChange={(value) =>
                                        setFormData((current) => ({
                                            ...current,
                                            source: value as LeadSource,
                                        }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sources.map((source) => (
                                            <SelectItem key={source} value={source}>
                                                {t(sourceLabels[source])}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>{t('Interested Class')}</Label>
                                <Input
                                    value={formData.interested_class}
                                    onChange={(event) =>
                                        setFormData((current) => ({
                                            ...current,
                                            interested_class: event.target.value,
                                        }))
                                    }
                                    placeholder={t('e.g. 6th Class')}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('Academic Year')}</Label>
                                <Input
                                    value={formData.academic_year}
                                    onChange={(event) =>
                                        setFormData((current) => ({
                                            ...current,
                                            academic_year: event.target.value,
                                        }))
                                    }
                                    placeholder={t('e.g. 2026-2027')}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('Status')}</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(value) =>
                                        setFormData((current) => ({
                                            ...current,
                                            status: value as LeadStatus,
                                        }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {statuses.map((status) => (
                                            <SelectItem key={status} value={status}>
                                                {t(status)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>{t('Priority')}</Label>
                                <Select
                                    value={formData.priority}
                                    onValueChange={(value) =>
                                        setFormData((current) => ({
                                            ...current,
                                            priority: value as LeadPriority,
                                        }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {priorities.map((priority) => (
                                            <SelectItem key={priority} value={priority}>
                                                {t(priority)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>{t('Follow-up Date')}</Label>
                                <Input
                                    type="date"
                                    value={formData.follow_up_date}
                                    onChange={(event) =>
                                        setFormData((current) => ({
                                            ...current,
                                            follow_up_date: event.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('Preferred Contact Time')}</Label>
                                <Input
                                    value={formData.preferred_contact_time}
                                    onChange={(event) =>
                                        setFormData((current) => ({
                                            ...current,
                                            preferred_contact_time: event.target.value,
                                        }))
                                    }
                                    placeholder={t('e.g. Evening after 6 PM')}
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label>{t('Assigned To')}</Label>
                                <Select
                                    value={formData.assigned_to}
                                    onValueChange={(value) =>
                                        setFormData((current) => ({
                                            ...current,
                                            assigned_to: value,
                                        }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Unassigned')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">{t('Unassigned')}</SelectItem>
                                        {staffMembers.map((staff) => (
                                            <SelectItem key={staff.id} value={String(staff.id)}>
                                                {staff.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label>{t('Notes')}</Label>
                                <Textarea
                                    value={formData.notes}
                                    onChange={(event) =>
                                        setFormData((current) => ({
                                            ...current,
                                            notes: event.target.value,
                                        }))
                                    }
                                    rows={4}
                                    placeholder={t('Add conversation or enquiry notes')}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                                {t('Cancel')}
                            </Button>
                            <Button type="button" onClick={saveLead} disabled={processing}>
                                {processing ? t('Saving...') : editingLead ? t('Update Lead') : t('Save Lead')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}
