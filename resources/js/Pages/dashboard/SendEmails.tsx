import { useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { MailCheck, Plus, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Textarea } from '../ui/textarea';

type AudienceType = 'staff' | 'students' | 'class_section' | 'individual_staff' | 'individual_students';

type EmailItem = {
  id: string;
  to: string;
  subject: string;
  preview: string;
  sentAt: string;
  status: 'Queued' | 'Delivered' | 'Failed';
};

type StaffRecord = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type StudentRecord = {
  id: string;
  name: string;
  email: string;
  class: string;
  section: string;
};

interface SendEmailsProps {
  user: any;
  staffRecords?: StaffRecord[];
  studentRecords?: StudentRecord[];
  emailHistory?: EmailItem[];
}

const roleLabels: Record<string, string> = {
  admin: 'Admins',
  teacher: 'Teachers',
  receptionist: 'Receptionists',
  accountant: 'Accountants',
  librarian: 'Librarians',
  student: 'Students',
  staff: 'All Staff',
};

const toTitleCase = (value: string) =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const getStaffDisplayName = (staff: StaffRecord) => staff.name || staff.email || 'Staff Member';

const getStudentDisplayName = (student: StudentRecord) => student.name || student.email || 'Student';

const getStudentClassSectionLabel = (student: StudentRecord) => {
  const classLabel = student.class ? `Class ${student.class}` : '';
  const sectionLabel = student.section ? `Section ${student.section}` : '';
  return [classLabel, sectionLabel].filter(Boolean).join(' - ');
};

export default function SendEmails({
  user,
  staffRecords = [],
  studentRecords = [],
  emailHistory = [],
}: SendEmailsProps) {
  const page = usePage<{ flash?: { success?: string; error?: string }; errors?: Record<string, string> }>();
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [sentCurrentPage, setSentCurrentPage] = useState(1);
  const [emails, setEmails] = useState<EmailItem[]>(emailHistory);
  const sentRowsPerPage = 10;
  const [emailForm, setEmailForm] = useState({
    audienceType: 'students' as AudienceType,
    staffRole: 'teacher',
    selectedStaffRoles: [] as string[],
    targetClass: '',
    targetSection: '',
    selectedGroups: [] as string[],
    selectedStaffUsers: [] as string[],
    selectedStudents: [] as string[],
    individualStaffRole: 'all',
    individualStaffSearch: '',
    individualStudentClass: 'all',
    individualStudentSection: 'all',
    individualStudentSearch: '',
    subject: '',
    content: '',
  });

  useEffect(() => {
    setEmails(emailHistory);
  }, [emailHistory]);

  useEffect(() => {
    if (page.props.flash?.success) {
      toast.success(page.props.flash.success);
    }

    if (page.props.flash?.error) {
      toast.error(page.props.flash.error);
    }
  }, [page.props.flash?.error, page.props.flash?.success]);

  const classOptions = useMemo(
    () => Array.from(new Set(studentRecords.map((student) => String(student.class)))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [studentRecords]
  );

  const sectionOptions = useMemo(() => {
    return Array.from(
      new Set(
        studentRecords
          .filter((student) => !emailForm.targetClass || String(student.class) === emailForm.targetClass)
          .map((student) => String(student.section))
      )
    ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [emailForm.targetClass, studentRecords]);

  const classSectionGroups = useMemo(
    () =>
      Array.from(new Set(studentRecords.map((student) => `${student.class}-${student.section}`))).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true })
      ),
    [studentRecords]
  );

  const staffRoleOptions = useMemo(
    () => Array.from(new Set(staffRecords.map((staff) => String(staff.role)))).sort(),
    [staffRecords]
  );

  const individualStaffOptions = useMemo(
    () =>
      staffRecords
        .map((staff) => ({
          id: String(staff.id),
          label: getStaffDisplayName(staff),
          email: staff.email || 'No email',
          role: roleLabels[String(staff.role)] || toTitleCase(String(staff.role || 'staff')),
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [staffRecords]
  );

  const individualStudentOptions = useMemo(
    () =>
      studentRecords
        .map((student) => ({
          id: String(student.id),
          label: getStudentDisplayName(student),
          email: student.email || 'No email',
          classSection: getStudentClassSectionLabel(student),
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [studentRecords]
  );

  const filteredIndividualStaffOptions = useMemo(
    () =>
      individualStaffOptions.filter((staff) => {
        const sourceStaff = staffRecords.find((item) => String(item.id) === staff.id);
        const matchesRole =
          emailForm.individualStaffRole === 'all' ||
          String(sourceStaff?.role || '') === emailForm.individualStaffRole;

        const query = emailForm.individualStaffSearch.trim().toLowerCase();
        const matchesSearch =
          !query ||
          staff.label.toLowerCase().includes(query) ||
          staff.email.toLowerCase().includes(query) ||
          staff.role.toLowerCase().includes(query);

        return matchesRole && matchesSearch;
      }),
    [emailForm.individualStaffRole, emailForm.individualStaffSearch, individualStaffOptions, staffRecords]
  );

  const filteredIndividualStudentOptions = useMemo(
    () =>
      individualStudentOptions.filter((student) => {
        const sourceStudent = studentRecords.find((item) => String(item.id) === student.id);
        const matchesClass =
          emailForm.individualStudentClass === 'all' ||
          String(sourceStudent?.class || '') === emailForm.individualStudentClass;
        const matchesSection =
          emailForm.individualStudentSection === 'all' ||
          String(sourceStudent?.section || '') === emailForm.individualStudentSection;

        const query = emailForm.individualStudentSearch.trim().toLowerCase();
        const matchesSearch =
          !query ||
          student.label.toLowerCase().includes(query) ||
          student.email.toLowerCase().includes(query) ||
          student.classSection.toLowerCase().includes(query);

        return matchesClass && matchesSection && matchesSearch;
      }),
    [
      emailForm.individualStudentClass,
      emailForm.individualStudentSearch,
      emailForm.individualStudentSection,
      individualStudentOptions,
      studentRecords,
    ]
  );

  const queuedCount = useMemo(() => emails.filter((email) => email.status === 'Queued').length, [emails]);
  const deliveredCount = useMemo(() => emails.filter((email) => email.status === 'Delivered').length, [emails]);
  const sentTotalPages = Math.max(1, Math.ceil(emails.length / sentRowsPerPage));
  const sentPaginatedEmails = useMemo(() => {
    const startIndex = (sentCurrentPage - 1) * sentRowsPerPage;
    return emails.slice(startIndex, startIndex + sentRowsPerPage);
  }, [emails, sentCurrentPage]);

  useEffect(() => {
    setSentCurrentPage((current) => Math.min(current, sentTotalPages));
  }, [sentTotalPages]);

  const resetEmailForm = () => {
    setEmailForm({
      audienceType: 'students',
      staffRole: 'teacher',
      selectedStaffRoles: [],
      targetClass: '',
      targetSection: '',
      selectedGroups: [],
      selectedStaffUsers: [],
      selectedStudents: [],
      individualStaffRole: 'all',
      individualStaffSearch: '',
      individualStudentClass: 'all',
      individualStudentSection: 'all',
      individualStudentSearch: '',
      subject: '',
      content: '',
    });
  };

  const addSelectedGroup = () => {
    if (!emailForm.targetClass || !emailForm.targetSection) {
      toast.error('Select class and section first');
      return;
    }

    const value = `${emailForm.targetClass}-${emailForm.targetSection}`;
    setEmailForm((current) => ({
      ...current,
      selectedGroups: current.selectedGroups.includes(value) ? current.selectedGroups : [...current.selectedGroups, value],
      targetClass: '',
      targetSection: '',
    }));
  };

  const toggleGroupSelection = (group: string) => {
    setEmailForm((current) => ({
      ...current,
      selectedGroups: current.selectedGroups.includes(group)
        ? current.selectedGroups.filter((item) => item !== group)
        : [...current.selectedGroups, group],
    }));
  };

  const addSelectedStaffRole = () => {
    if (!emailForm.staffRole) {
      toast.error('Select a staff group first');
      return;
    }

    setEmailForm((current) => ({
      ...current,
      selectedStaffRoles: current.selectedStaffRoles.includes(current.staffRole)
        ? current.selectedStaffRoles
        : [...current.selectedStaffRoles, current.staffRole],
      staffRole: 'teacher',
    }));
  };

  const toggleStaffRoleSelection = (role: string) => {
    setEmailForm((current) => ({
      ...current,
      selectedStaffRoles: current.selectedStaffRoles.includes(role)
        ? current.selectedStaffRoles.filter((item) => item !== role)
        : [...current.selectedStaffRoles, role],
    }));
  };

  const toggleStaffUserSelection = (staffId: string) => {
    setEmailForm((current) => ({
      ...current,
      selectedStaffUsers: current.selectedStaffUsers.includes(staffId)
        ? current.selectedStaffUsers.filter((item) => item !== staffId)
        : [...current.selectedStaffUsers, staffId],
    }));
  };

  const toggleStudentSelection = (studentId: string) => {
    setEmailForm((current) => ({
      ...current,
      selectedStudents: current.selectedStudents.includes(studentId)
        ? current.selectedStudents.filter((item) => item !== studentId)
        : [...current.selectedStudents, studentId],
    }));
  };

  const handleSendEmail = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (emailForm.audienceType === 'staff' && emailForm.selectedStaffRoles.length === 0) {
      toast.error('Select at least one staff group');
      return;
    }

    if (emailForm.audienceType === 'class_section' && emailForm.selectedGroups.length === 0) {
      toast.error('Select at least one class and section group');
      return;
    }

    if (emailForm.audienceType === 'individual_staff' && emailForm.selectedStaffUsers.length === 0) {
      toast.error('Select at least one staff member');
      return;
    }

    if (emailForm.audienceType === 'individual_students' && emailForm.selectedStudents.length === 0) {
      toast.error('Select at least one student');
      return;
    }

    router.post(
      '/communication/send-emails',
      {
        audienceType: emailForm.audienceType,
        selectedStaffRoles: emailForm.selectedStaffRoles,
        selectedGroups: emailForm.selectedGroups,
        selectedStaffUsers: emailForm.selectedStaffUsers,
        selectedStudents: emailForm.selectedStudents,
        subject: emailForm.subject,
        content: emailForm.content,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          resetEmailForm();
          setShowEmailDialog(false);
          setSentCurrentPage(1);
        },
      }
    );
  };

  const handleDeleteHistory = (emailId: string) => {
    if (!window.confirm('Delete this email history entry?')) {
      return;
    }

    router.delete(`/communication/send-emails/${emailId}`, {
      preserveScroll: true,
      onSuccess: () => {
        setSentCurrentPage(1);
      },
    });
  };

  return (
    <DashboardLayout user={user} activeTab="send-emails">
      <div className="space-y-6 p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold text-slate-900">Send Emails</h1>
            <p className="mt-1 text-slate-600">Send formal email updates to all staff, role-wise staff, all students, class sections, or individual staff and students.</p>
          </div>

          <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2 self-start md:shrink-0">
                <Plus className="h-4 w-4" />
                New Email
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Compose email</DialogTitle>
                <DialogDescription>Queue an email for all staff, role-wise staff, all students, class sections, or individual staff and students.</DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSendEmail} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Audience Type</Label>
                    <Select
                      value={emailForm.audienceType}
                      onValueChange={(value: AudienceType) =>
                        setEmailForm((current) => ({
                          ...current,
                          audienceType: value,
                          staffRole: value === 'staff' ? current.staffRole : 'teacher',
                          selectedStaffRoles: value === 'staff' ? current.selectedStaffRoles : [],
                          targetClass: value === 'class_section' ? current.targetClass : '',
                          targetSection: value === 'class_section' ? current.targetSection : '',
                          selectedGroups: value === 'class_section' ? current.selectedGroups : [],
                          selectedStaffUsers: value === 'individual_staff' ? current.selectedStaffUsers : [],
                          selectedStudents: value === 'individual_students' ? current.selectedStudents : [],
                          individualStaffRole: value === 'individual_staff' ? current.individualStaffRole : 'all',
                          individualStaffSearch: value === 'individual_staff' ? current.individualStaffSearch : '',
                          individualStudentClass: value === 'individual_students' ? current.individualStudentClass : 'all',
                          individualStudentSection: value === 'individual_students' ? current.individualStudentSection : 'all',
                          individualStudentSearch: value === 'individual_students' ? current.individualStudentSearch : '',
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staff">All Staff / Role-wise Staff</SelectItem>
                        <SelectItem value="students">All Students</SelectItem>
                        <SelectItem value="class_section">Students by Class & Section</SelectItem>
                        <SelectItem value="individual_staff">Individual Staff</SelectItem>
                        <SelectItem value="individual_students">Individual Students</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {emailForm.audienceType === 'staff' ? (
                    <>
                      <div className="space-y-2">
                        <Label>Staff Group</Label>
                        <Select
                          value={emailForm.staffRole}
                          onValueChange={(value) => setEmailForm((current) => ({ ...current, staffRole: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {staffRoleOptions.map((role) => (
                              <SelectItem key={role} value={role}>
                                {roleLabels[role] || toTitleCase(role)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>&nbsp;</Label>
                        <Button type="button" variant="outline" className="w-full" onClick={addSelectedStaffRole}>
                          Add Staff Group
                        </Button>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Selected Staff Groups</Label>
                        <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 p-3">
                          {emailForm.selectedStaffRoles.length > 0 ? (
                            emailForm.selectedStaffRoles.map((role) => (
                              <Badge key={role} variant="secondary" className="cursor-pointer" onClick={() => toggleStaffRoleSelection(role)}>
                                {roleLabels[role] || toTitleCase(role)}
                              </Badge>
                            ))
                          ) : (
                            <p className="text-sm text-slate-500">No staff groups selected yet.</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Quick Multi-Select</Label>
                        <div className="grid gap-2 rounded-lg border border-slate-200 p-3 md:grid-cols-2">
                          {staffRoleOptions.map((role) => (
                            <label key={role} className="flex items-center gap-2 text-sm text-slate-700">
                              <Checkbox checked={emailForm.selectedStaffRoles.includes(role)} onCheckedChange={() => toggleStaffRoleSelection(role)} />
                              <span>{roleLabels[role] || toTitleCase(role)}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : null}

                  {emailForm.audienceType === 'class_section' ? (
                    <>
                      <div className="space-y-2">
                        <Label>Class</Label>
                        <Select
                          value={emailForm.targetClass}
                          onValueChange={(value) => setEmailForm((current) => ({ ...current, targetClass: value, targetSection: '' }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select class" />
                          </SelectTrigger>
                          <SelectContent>
                            {classOptions.map((className) => (
                              <SelectItem key={className} value={className}>
                                Class {className}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Section</Label>
                        <Select
                          value={emailForm.targetSection}
                          onValueChange={(value) => setEmailForm((current) => ({ ...current, targetSection: value }))}
                          disabled={!emailForm.targetClass}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select section" />
                          </SelectTrigger>
                          <SelectContent>
                            {sectionOptions.map((section) => (
                              <SelectItem key={section} value={section}>
                                Section {section}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <div className="flex items-center justify-between gap-3">
                          <Label>Selected Groups</Label>
                          <Button type="button" variant="outline" size="sm" onClick={addSelectedGroup}>
                            Add Group
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 p-3">
                          {emailForm.selectedGroups.length > 0 ? (
                            emailForm.selectedGroups.map((group) => (
                              <Badge key={group} variant="secondary" className="cursor-pointer" onClick={() => toggleGroupSelection(group)}>
                                {group}
                              </Badge>
                            ))
                          ) : (
                            <p className="text-sm text-slate-500">No class-section groups selected yet.</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Quick Multi-Select</Label>
                        <div className="grid gap-2 rounded-lg border border-slate-200 p-3 md:grid-cols-2">
                          {classSectionGroups.map((group) => (
                            <label key={group} className="flex items-center gap-2 text-sm text-slate-700">
                              <Checkbox checked={emailForm.selectedGroups.includes(group)} onCheckedChange={() => toggleGroupSelection(group)} />
                              <span>{group}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : null}

                  {emailForm.audienceType === 'individual_staff' ? (
                    <>
                      <div className="space-y-2">
                        <Label>Staff Role</Label>
                        <Select
                          value={emailForm.individualStaffRole}
                          onValueChange={(value) => setEmailForm((current) => ({ ...current, individualStaffRole: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Staff Roles</SelectItem>
                            {staffRoleOptions.map((role) => (
                              <SelectItem key={role} value={role}>
                                {roleLabels[role] || toTitleCase(role)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="individual-staff-search">Search Individual</Label>
                        <Input
                          id="individual-staff-search"
                          placeholder="Search by staff name or email"
                          value={emailForm.individualStaffSearch}
                          onChange={(event) => setEmailForm((current) => ({ ...current, individualStaffSearch: event.target.value }))}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Select Staff Members</Label>
                        <div className="grid max-h-64 gap-2 overflow-y-auto rounded-lg border border-slate-200 p-3 md:grid-cols-2">
                          {filteredIndividualStaffOptions.length > 0 ? (
                            filteredIndividualStaffOptions.map((staff) => (
                              <label key={staff.id} className="flex items-start gap-2 rounded-md border border-slate-100 p-2 text-sm text-slate-700">
                                <Checkbox checked={emailForm.selectedStaffUsers.includes(staff.id)} onCheckedChange={() => toggleStaffUserSelection(staff.id)} />
                                <span>
                                  <span className="block font-medium text-slate-900">{staff.label}</span>
                                  <span className="block text-xs text-slate-500">{staff.role}</span>
                                  <span className="block text-xs text-slate-500">{staff.email}</span>
                                </span>
                              </label>
                            ))
                          ) : (
                            <p className="text-sm text-slate-500">No staff found for the selected role or search.</p>
                          )}
                        </div>
                      </div>
                    </>
                  ) : null}

                  {emailForm.audienceType === 'individual_students' ? (
                    <>
                      <div className="space-y-2">
                        <Label>Class</Label>
                        <Select
                          value={emailForm.individualStudentClass}
                          onValueChange={(value) =>
                            setEmailForm((current) => ({
                              ...current,
                              individualStudentClass: value,
                              individualStudentSection: 'all',
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Classes</SelectItem>
                            {classOptions.map((className) => (
                              <SelectItem key={className} value={className}>
                                Class {className}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Section</Label>
                        <Select
                          value={emailForm.individualStudentSection}
                          onValueChange={(value) => setEmailForm((current) => ({ ...current, individualStudentSection: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Sections</SelectItem>
                            {Array.from(
                              new Set(
                                studentRecords
                                  .filter(
                                    (student) =>
                                      emailForm.individualStudentClass === 'all' ||
                                      String(student.class) === emailForm.individualStudentClass
                                  )
                                  .map((student) => String(student.section))
                              )
                            )
                              .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
                              .map((section) => (
                                <SelectItem key={section} value={section}>
                                  Section {section}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="individual-student-search">Search Individual</Label>
                        <Input
                          id="individual-student-search"
                          placeholder="Search by student name or email"
                          value={emailForm.individualStudentSearch}
                          onChange={(event) => setEmailForm((current) => ({ ...current, individualStudentSearch: event.target.value }))}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Select Students</Label>
                        <div className="grid max-h-64 gap-2 overflow-y-auto rounded-lg border border-slate-200 p-3 md:grid-cols-2">
                          {filteredIndividualStudentOptions.length > 0 ? (
                            filteredIndividualStudentOptions.map((student) => (
                              <label key={student.id} className="flex items-start gap-2 rounded-md border border-slate-100 p-2 text-sm text-slate-700">
                                <Checkbox checked={emailForm.selectedStudents.includes(student.id)} onCheckedChange={() => toggleStudentSelection(student.id)} />
                                <span>
                                  <span className="block font-medium text-slate-900">{student.label}</span>
                                  <span className="block text-xs text-slate-500">{student.classSection || 'Class not assigned'}</span>
                                  <span className="block text-xs text-slate-500">{student.email}</span>
                                </span>
                              </label>
                            ))
                          ) : (
                            <p className="text-sm text-slate-500">No students found for the selected class, section, or search.</p>
                          )}
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email-subject">Subject</Label>
                  <Input
                    id="email-subject"
                    value={emailForm.subject}
                    onChange={(event) => setEmailForm((current) => ({ ...current, subject: event.target.value }))}
                    required
                  />
                  {page.props.errors?.subject ? <p className="text-sm text-red-600">{page.props.errors.subject}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email-content">Content</Label>
                  <Textarea
                    id="email-content"
                    rows={6}
                    value={emailForm.content}
                    onChange={(event) => setEmailForm((current) => ({ ...current, content: event.target.value }))}
                    required
                  />
                  {page.props.errors?.content ? <p className="text-sm text-red-600">{page.props.errors.content}</p> : null}
                </div>

                {page.props.errors?.email_recipients ? <p className="text-sm text-red-600">{page.props.errors.email_recipients}</p> : null}
                {page.props.errors?.email_delivery ? <p className="text-sm text-red-600">{page.props.errors.email_delivery}</p> : null}

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowEmailDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Send Email</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-500">Queued</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{queuedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-500">Delivered</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{deliveredCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-500">Sent History</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{emails.length}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-blue-600" />
              Sent history
            </CardTitle>
            <CardDescription>Saved history of all communication sent through the backend email delivery flow.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {emails.length > 0 ? (
              <>
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Content</TableHead>
                        <TableHead>Queued On</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sentPaginatedEmails.map((email) => (
                        <TableRow key={email.id}>
                          <TableCell className="max-w-[220px] whitespace-normal font-medium text-slate-900">{email.subject}</TableCell>
                          <TableCell className="max-w-[220px] whitespace-normal text-slate-600">{email.to}</TableCell>
                          <TableCell className="max-w-[360px] whitespace-normal text-slate-600">{email.preview}</TableCell>
                          <TableCell className="text-slate-500">{email.sentAt}</TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={
                                email.status === 'Delivered'
                                  ? 'bg-green-100 text-green-700 hover:bg-green-100'
                                  : email.status === 'Failed'
                                  ? 'bg-red-100 text-red-700 hover:bg-red-100'
                                  : 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                              }
                            >
                              {email.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => handleDeleteHistory(email.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
                  <p>
                    Showing {(sentCurrentPage - 1) * sentRowsPerPage + 1} to {Math.min(sentCurrentPage * sentRowsPerPage, emails.length)} of {emails.length} emails
                  </p>
                  <div className="flex items-center gap-2 self-start md:self-auto">
                    <Button type="button" variant="outline" size="sm" onClick={() => setSentCurrentPage((current) => Math.max(1, current - 1))} disabled={sentCurrentPage === 1}>
                      Previous
                    </Button>
                    <span>
                      Page {sentCurrentPage} of {sentTotalPages}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSentCurrentPage((current) => Math.min(sentTotalPages, current + 1))}
                      disabled={sentCurrentPage === sentTotalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500">
                No email history available yet. Send your first operational email from the composer above.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MailCheck className="h-5 w-5 text-blue-600" />
              Sending rules
            </CardTitle>
            <CardDescription>How backend recipient targeting works for this email module.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-medium text-slate-900">All Staff / Role-wise</p>
              <p className="mt-1">Sends to active staff users with valid email addresses.</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-medium text-slate-900">All Students</p>
              <p className="mt-1">Sends to active students who have deliverable student email records.</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-medium text-slate-900">Class & Section</p>
              <p className="mt-1">Targets only the selected class-section student groups.</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-medium text-slate-900">Individual Users</p>
              <p className="mt-1">Use role/class filters and search to send to exact staff members or students.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
