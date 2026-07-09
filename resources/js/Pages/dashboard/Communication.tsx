import { FormEvent, useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Bell, Eye, MessageSquare, Plus, Send, Trash2 } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { toast } from 'sonner';

interface CommunicationProps {
  user: any;
  staffRecords: Array<{ id: string; name: string; role: string }>;
  studentRecords: Array<{ id: string; name: string; class: string; section: string; hasUser: boolean }>;
  sentMessages: Array<{ id: string; to: string; subject: string; content: string; time: string; status: 'Sent'; recipientCount: number }>;
}

type AudienceType = 'staff' | 'students' | 'class_section';

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

export default function Communication({ user, staffRecords, studentRecords, sentMessages }: CommunicationProps) {
  const page = usePage<{ flash?: { success?: string; error?: string }; errors?: Record<string, string> }>();
  const flash = page.props.flash ?? {};
  const validationErrors = page.props.errors ?? {};
  const [showComposeDialog, setShowComposeDialog] = useState(false);
  const [sentCurrentPage, setSentCurrentPage] = useState(1);
  const [viewingMessage, setViewingMessage] = useState<CommunicationProps['sentMessages'][number] | null>(null);
  const sentRowsPerPage = 10;
  const [composeForm, setComposeForm] = useState({
    audienceType: 'students' as AudienceType,
    staffRole: 'teacher',
    selectedStaffRoles: [] as string[],
    targetClass: '',
    targetSection: '',
    selectedGroups: [] as string[],
    subject: '',
    content: '',
    sendNotification: true,
  });

  useEffect(() => {
    if (flash.success) {
      toast.success(flash.success);
    }

    if (flash.error) {
      toast.error(flash.error);
    }
  }, [flash.error, flash.success]);

  useEffect(() => {
    if (validationErrors.message_recipients) {
      toast.error(validationErrors.message_recipients);
    }
  }, [validationErrors.message_recipients]);

  const classOptions = useMemo(
    () => Array.from(new Set(studentRecords.map((student) => String(student.class)).filter(Boolean))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [studentRecords]
  );

  const sectionOptions = useMemo(() => {
    return Array.from(
      new Set(
        studentRecords
          .filter((student) => !composeForm.targetClass || String(student.class) === composeForm.targetClass)
          .map((student) => String(student.section))
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [composeForm.targetClass, studentRecords]);

  const classSectionGroups = useMemo(() => {
    return Array.from(new Set(studentRecords.filter((student) => student.hasUser).map((student) => `${student.class}-${student.section}`))).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    );
  }, [studentRecords]);

  const staffRoleOptions = useMemo(
    () => Array.from(new Set(staffRecords.map((staff) => String(staff.role)).filter(Boolean))).sort(),
    [staffRecords]
  );

  const sentTotalPages = Math.max(1, Math.ceil(sentMessages.length / sentRowsPerPage));
  const sentPaginatedMessages = useMemo(() => {
    const startIndex = (sentCurrentPage - 1) * sentRowsPerPage;
    return sentMessages.slice(startIndex, startIndex + sentRowsPerPage);
  }, [sentCurrentPage, sentMessages]);

  useEffect(() => {
    setSentCurrentPage((current) => Math.min(current, sentTotalPages));
  }, [sentTotalPages]);

  const resetComposeForm = () => {
    setComposeForm({
      audienceType: 'students',
      staffRole: 'teacher',
      selectedStaffRoles: [],
      targetClass: '',
      targetSection: '',
      selectedGroups: [],
      subject: '',
      content: '',
      sendNotification: true,
    });
  };

  const handleComposeMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (composeForm.audienceType === 'staff' && composeForm.selectedStaffRoles.length === 0) {
      toast.error('Select at least one staff group');
      return;
    }

    if (composeForm.audienceType === 'class_section' && composeForm.selectedGroups.length === 0) {
      toast.error('Select at least one class and section group');
      return;
    }

    router.post(
      '/communication',
      {
        audienceType: composeForm.audienceType,
        selectedStaffRoles: composeForm.selectedStaffRoles,
        selectedGroups: composeForm.selectedGroups,
        subject: composeForm.subject,
        content: composeForm.content,
        sendNotification: composeForm.sendNotification,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          resetComposeForm();
          setShowComposeDialog(false);
        },
      }
    );
  };

  const handleDeleteHistory = (messageId: string) => {
    if (!window.confirm('Delete this message history entry?')) {
      return;
    }

    router.delete(`/communication/${messageId}`, {
      preserveScroll: true,
      onSuccess: () => {
        setSentCurrentPage(1);
        setViewingMessage(null);
      },
    });
  };

  const addSelectedGroup = () => {
    if (!composeForm.targetClass || !composeForm.targetSection) {
      toast.error('Select class and section first');
      return;
    }

    const value = `${composeForm.targetClass}-${composeForm.targetSection}`;
    setComposeForm((current) => ({
      ...current,
      selectedGroups: current.selectedGroups.includes(value) ? current.selectedGroups : [...current.selectedGroups, value],
      targetClass: '',
      targetSection: '',
    }));
  };

  const toggleGroupSelection = (group: string) => {
    setComposeForm((current) => ({
      ...current,
      selectedGroups: current.selectedGroups.includes(group)
        ? current.selectedGroups.filter((item) => item !== group)
        : [...current.selectedGroups, group],
    }));
  };

  const addSelectedStaffRole = () => {
    if (!composeForm.staffRole) {
      toast.error('Select a staff group first');
      return;
    }

    setComposeForm((current) => ({
      ...current,
      selectedStaffRoles: current.selectedStaffRoles.includes(current.staffRole)
        ? current.selectedStaffRoles
        : [...current.selectedStaffRoles, current.staffRole],
      staffRole: 'teacher',
    }));
  };

  const toggleStaffRoleSelection = (role: string) => {
    setComposeForm((current) => ({
      ...current,
      selectedStaffRoles: current.selectedStaffRoles.includes(role)
        ? current.selectedStaffRoles.filter((item) => item !== role)
        : [...current.selectedStaffRoles, role],
    }));
  };

  return (
    <DashboardLayout user={user} activeTab="communication">
      <div className="space-y-6 p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold text-slate-900">Messages</h1>
            <p className="mt-1 text-slate-600">Manage sent communication and send updates to staff or student groups.</p>
          </div>
          <Dialog open={showComposeDialog} onOpenChange={setShowComposeDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2 self-start md:shrink-0">
                <Plus className="h-4 w-4" />
                New Message
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] w-[95vw] max-w-2xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Compose message</DialogTitle>
                <DialogDescription>Send a message to staff, all students, or a specific class and section.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleComposeMessage} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Audience Type</Label>
                    <Select
                      value={composeForm.audienceType}
                      onValueChange={(value: AudienceType) =>
                        setComposeForm((current) => ({
                          ...current,
                          audienceType: value,
                          staffRole: value === 'staff' ? current.staffRole : 'teacher',
                          selectedStaffRoles: value === 'staff' ? current.selectedStaffRoles : [],
                          targetClass: value === 'class_section' ? current.targetClass : '',
                          targetSection: value === 'class_section' ? current.targetSection : '',
                          selectedGroups: value === 'class_section' ? current.selectedGroups : [],
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="students">All Students</SelectItem>
                        <SelectItem value="class_section">Students by Class & Section</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {composeForm.audienceType === 'staff' ? (
                    <>
                      <div className="space-y-2">
                        <Label>Staff Group</Label>
                        <Select value={composeForm.staffRole} onValueChange={(value) => setComposeForm((current) => ({ ...current, staffRole: value }))}>
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
                          {composeForm.selectedStaffRoles.length > 0 ? (
                            composeForm.selectedStaffRoles.map((role) => (
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
                              <Checkbox checked={composeForm.selectedStaffRoles.includes(role)} onCheckedChange={() => toggleStaffRoleSelection(role)} />
                              <span>{roleLabels[role] || toTitleCase(role)}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : null}

                  {composeForm.audienceType === 'class_section' ? (
                    <>
                      <div className="space-y-2">
                        <Label>Class</Label>
                        <Select value={composeForm.targetClass} onValueChange={(value) => setComposeForm((current) => ({ ...current, targetClass: value, targetSection: '' }))}>
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
                        <Select value={composeForm.targetSection} onValueChange={(value) => setComposeForm((current) => ({ ...current, targetSection: value }))} disabled={!composeForm.targetClass}>
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
                          {composeForm.selectedGroups.length > 0 ? (
                            composeForm.selectedGroups.map((group) => (
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
                              <Checkbox checked={composeForm.selectedGroups.includes(group)} onCheckedChange={() => toggleGroupSelection(group)} />
                              <span>{group}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message-subject">Subject</Label>
                  <Input id="message-subject" value={composeForm.subject} onChange={(event) => setComposeForm((current) => ({ ...current, subject: event.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message-content">Message</Label>
                  <Textarea id="message-content" rows={5} value={composeForm.content} onChange={(event) => setComposeForm((current) => ({ ...current, content: event.target.value }))} required />
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                  <Bell className="h-5 w-5 text-blue-600" />
                  <div className="flex-1">
                    <label htmlFor="send-notification" className="text-sm font-medium text-slate-700">
                      Send Push Notification
                    </label>
                    <p className="text-xs text-slate-500">Deliver this message as a push notification to mobile app users.</p>
                  </div>
                  <Checkbox
                    id="send-notification"
                    checked={composeForm.sendNotification}
                    onCheckedChange={(checked) => setComposeForm((current) => ({ ...current, sendNotification: checked === true }))}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowComposeDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Send</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-500">Sent History</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{sentMessages.length}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-blue-600" />
              Sent history
            </CardTitle>
            <CardDescription>Saved history of all communication sent from your account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sentMessages.length > 0 ? (
              <>
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Sent On</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sentPaginatedMessages.map((message) => (
                        <TableRow key={message.id}>
                          <TableCell className="max-w-[220px] whitespace-normal font-medium text-slate-900">{message.subject}</TableCell>
                          <TableCell className="max-w-[220px] whitespace-normal text-slate-600">{message.to}</TableCell>
                          <TableCell className="max-w-[360px] whitespace-normal text-slate-600">{message.content}</TableCell>
                          <TableCell className="text-slate-500">{message.time}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{message.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setViewingMessage(message)}>
                                <Eye className="h-4 w-4" />
                                View
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                                onClick={() => handleDeleteHistory(message.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
                  <p>
                    Showing {(sentCurrentPage - 1) * sentRowsPerPage + 1} to {Math.min(sentCurrentPage * sentRowsPerPage, sentMessages.length)} of {sentMessages.length} messages
                  </p>
                  <div className="flex items-center gap-2 self-start md:self-auto">
                    <Button type="button" variant="outline" size="sm" onClick={() => setSentCurrentPage((current) => Math.max(1, current - 1))} disabled={sentCurrentPage === 1}>
                      Previous
                    </Button>
                    <span>
                      Page {sentCurrentPage} of {sentTotalPages}
                    </span>
                    <Button type="button" variant="outline" size="sm" onClick={() => setSentCurrentPage((current) => Math.min(sentTotalPages, current + 1))} disabled={sentCurrentPage === sentTotalPages}>
                      Next
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">No sent messages yet.</p>
            )}
          </CardContent>
        </Card>

        <Dialog open={Boolean(viewingMessage)} onOpenChange={(open) => !open && setViewingMessage(null)}>
          <DialogContent className="max-h-[90vh] w-[95vw] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Message details</DialogTitle>
              <DialogDescription>Review the full communication record and recipient summary.</DialogDescription>
            </DialogHeader>

            {viewingMessage ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Subject</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">{viewingMessage.subject}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">{viewingMessage.status}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recipients</p>
                    <p className="mt-2 text-sm text-slate-900">{viewingMessage.to}</p>
                    <p className="mt-1 text-xs text-slate-500">{viewingMessage.recipientCount} recipient(s)</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sent On</p>
                    <p className="mt-2 text-sm text-slate-900">{viewingMessage.time}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Message</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{viewingMessage.content}</p>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-emerald-600" />
              Operational Notes
            </CardTitle>
            <CardDescription>This section now uses the backend database instead of mock data.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {[
              'Staff messages resolve active staff users by selected roles.',
              'Student messages send only to students linked to a user account.',
              'Sent history is loaded from the messages table for the current sender.',
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
