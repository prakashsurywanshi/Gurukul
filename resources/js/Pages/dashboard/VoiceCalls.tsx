import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Bell, Eye, Mic, PhoneCall, Plus, Send, Trash2, Upload, X } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { toast } from 'sonner';

interface VoiceRecord {
  id: string;
  name: string;
  role?: string;
  class?: string;
  section?: string;
  phone?: string | null;
}

interface CallItem {
  id: string;
  to: string;
  subject: string;
  preview: string;
  scheduledFor: string;
  status: 'Scheduled' | 'Completed' | 'Partial' | 'Failed' | 'Cancelled';
  recipientCount: number;
  recipientPhones: string[];
  providerName?: string | null;
  providerReference?: string | null;
  errorMessage?: string | null;
  audioFileName?: string | null;
  audioUrl?: string | null;
  sentAt?: string | null;
}

interface VoiceCallsProps {
  user: any;
  staffRecords: VoiceRecord[];
  studentRecords: VoiceRecord[];
  callHistory: CallItem[];
  smartfloConfigured: boolean;
}

type AudienceType = 'staff' | 'students' | 'class_section';

const roleLabels: Record<string, string> = {
  admin: 'Admins',
  teacher: 'Teachers',
  receptionist: 'Receptionists',
  accountant: 'Accountants',
  librarian: 'Librarians',
};

const toTitleCase = (value: string) =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export default function VoiceCalls({ user, staffRecords, studentRecords, callHistory, smartfloConfigured }: VoiceCallsProps) {
  const page = usePage<{ flash?: { success?: string; error?: string }; errors?: Record<string, string> }>();
  const flash = page.props.flash ?? {};
  const validationErrors = page.props.errors ?? {};
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [sentCurrentPage, setSentCurrentPage] = useState(1);
  const [viewingCall, setViewingCall] = useState<CallItem | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [sendNotification, setSendNotification] = useState(true);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [callForm, setCallForm] = useState({
    audienceType: 'students' as AudienceType,
    staffRole: 'teacher',
    selectedStaffRoles: [] as string[],
    targetClass: '',
    targetSection: '',
    selectedGroups: [] as string[],
    subject: '',
    content: '',
    scheduledFor: '',
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
    if (validationErrors.voice_delivery) {
      toast.error(validationErrors.voice_delivery);
    }

    if (validationErrors.voice_recipients) {
      toast.error(validationErrors.voice_recipients);
    }
  }, [validationErrors.voice_delivery, validationErrors.voice_recipients]);

  const calls = callHistory ?? [];
  const sentRowsPerPage = 10;

  const classOptions = useMemo(
    () => Array.from(new Set(studentRecords.map((student) => String(student.class || '')).filter(Boolean))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [studentRecords]
  );

  const sectionOptions = useMemo(() => {
    return Array.from(
      new Set(
        studentRecords
          .filter((student) => !callForm.targetClass || String(student.class) === callForm.targetClass)
          .map((student) => String(student.section || ''))
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [callForm.targetClass, studentRecords]);

  const staffRoleOptions = useMemo(
    () => Array.from(new Set(staffRecords.map((staff) => String(staff.role || '')).filter(Boolean))).sort(),
    [staffRecords]
  );

  const scheduledCount = useMemo(() => calls.filter((call) => call.status === 'Scheduled').length, [calls]);
  const completedCount = useMemo(() => calls.filter((call) => call.status === 'Completed' || call.status === 'Partial').length, [calls]);
  const missedCount = useMemo(() => calls.filter((call) => call.status === 'Failed' || call.status === 'Cancelled').length, [calls]);
  const sentTotalPages = Math.max(1, Math.ceil(calls.length / sentRowsPerPage));
  const sentPaginatedCalls = useMemo(() => {
    const startIndex = (sentCurrentPage - 1) * sentRowsPerPage;
    return calls.slice(startIndex, startIndex + sentRowsPerPage);
  }, [calls, sentCurrentPage]);

  useEffect(() => {
    setSentCurrentPage((current) => Math.min(current, sentTotalPages));
  }, [sentTotalPages]);

  const resetCallForm = () => {
    setCallForm({
      audienceType: 'students',
      staffRole: 'teacher',
      selectedStaffRoles: [],
      targetClass: '',
      targetSection: '',
      selectedGroups: [],
      subject: '',
      content: '',
      scheduledFor: '',
    });
    setAudioFile(null);
    setSendNotification(true);
    if (audioInputRef.current) {
      audioInputRef.current.value = '';
    }
  };

  const handleScheduleCall = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (callForm.audienceType === 'staff' && callForm.selectedStaffRoles.length === 0) {
      toast.error('Select at least one staff group');
      return;
    }

    if (callForm.audienceType === 'class_section' && callForm.selectedGroups.length === 0) {
      toast.error('Select at least one class and section group');
      return;
    }

    const formData = new FormData();
    formData.append('audienceType', callForm.audienceType);
    formData.append('subject', callForm.subject);
    if (callForm.content) formData.append('content', callForm.content);
    if (callForm.scheduledFor) formData.append('scheduledFor', callForm.scheduledFor);
    formData.append('sendNotification', sendNotification ? '1' : '0');

    if (callForm.audienceType === 'staff') {
      callForm.selectedStaffRoles.forEach((role) => formData.append('selectedStaffRoles[]', role));
    }

    if (callForm.audienceType === 'class_section') {
      callForm.selectedGroups.forEach((group) => formData.append('selectedGroups[]', group));
    }

    if (audioFile) {
      formData.append('audioFile', audioFile);
    }

    router.post(
      '/communication/voice-calls',
      formData,
      {
        preserveScroll: true,
        forceFormData: true,
        onSuccess: () => {
          resetCallForm();
          setShowCallDialog(false);
          setSentCurrentPage(1);
        },
      }
    );
  };

  const addSelectedGroup = () => {
    if (!callForm.targetClass || !callForm.targetSection) {
      toast.error('Select class and section first');
      return;
    }

    const value = `${callForm.targetClass}-${callForm.targetSection}`;
    setCallForm((current) => ({
      ...current,
      selectedGroups: current.selectedGroups.includes(value) ? current.selectedGroups : [...current.selectedGroups, value],
      targetClass: '',
      targetSection: '',
    }));
  };

  const toggleGroupSelection = (group: string) => {
    setCallForm((current) => ({
      ...current,
      selectedGroups: current.selectedGroups.includes(group)
        ? current.selectedGroups.filter((item) => item !== group)
        : [...current.selectedGroups, group],
    }));
  };

  const addSelectedStaffRole = () => {
    if (!callForm.staffRole) {
      toast.error('Select a staff group first');
      return;
    }

    setCallForm((current) => ({
      ...current,
      selectedStaffRoles: current.selectedStaffRoles.includes(current.staffRole)
        ? current.selectedStaffRoles
        : [...current.selectedStaffRoles, current.staffRole],
      staffRole: 'teacher',
    }));
  };

  const toggleStaffRoleSelection = (role: string) => {
    setCallForm((current) => ({
      ...current,
      selectedStaffRoles: current.selectedStaffRoles.includes(role)
        ? current.selectedStaffRoles.filter((item) => item !== role)
        : [...current.selectedStaffRoles, role],
    }));
  };

  const handleCancelCall = (callId: string) => {
    router.patch(`/communication/voice-calls/${callId}/cancel`, {}, { preserveScroll: true });
  };

  const handleDeleteCall = (callId: string) => {
    if (!window.confirm('Delete this voice call history entry?')) {
      return;
    }

    router.delete(`/communication/voice-calls/${callId}`, {
      preserveScroll: true,
      onSuccess: () => {
        setSentCurrentPage(1);
        setViewingCall(null);
      },
    });
  };

  return (
    <DashboardLayout user={user} activeTab="voice-calls">
      <div className="space-y-6 p-8">

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold text-slate-900">Voice Calls</h1>
            <p className="mt-1 text-slate-600">Start Smartflo voice calls for staff, all students, or selected class sections.</p>
          </div>
          <Dialog open={showCallDialog} onOpenChange={(open) => { if (!open) resetCallForm(); setShowCallDialog(open); }}>
            <DialogTrigger asChild>
              <Button className="gap-2 self-start md:shrink-0">
                <Plus className="h-4 w-4" />
                Start Call
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-h-[90vh] max-w-2xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Start voice call</DialogTitle>
                <DialogDescription>Create a Smartflo voice-call request for staff, all students, or selected class-section groups.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleScheduleCall} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Audience Type</Label>
                    <Select
                      value={callForm.audienceType}
                      onValueChange={(value: AudienceType) =>
                        setCallForm((current) => ({
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

                  {callForm.audienceType === 'staff' ? (
                    <>
                      <div className="space-y-2">
                        <Label>Staff Group</Label>
                        <Select value={callForm.staffRole} onValueChange={(value) => setCallForm((current) => ({ ...current, staffRole: value }))}>
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
                        <div className="flex min-h-12 flex-wrap gap-2 rounded-lg border border-slate-200 p-3">
                          {callForm.selectedStaffRoles.length > 0 ? (
                            callForm.selectedStaffRoles.map((role) => (
                              <Badge key={role} variant="secondary" className="cursor-pointer" onClick={() => toggleStaffRoleSelection(role)}>
                                {roleLabels[role] || toTitleCase(role)}
                              </Badge>
                            ))
                          ) : (
                            <p className="text-sm text-slate-500">No staff groups selected yet.</p>
                          )}
                        </div>
                      </div>
                    </>
                  ) : null}

                  {callForm.audienceType === 'class_section' ? (
                    <>
                      <div className="space-y-2">
                        <Label>Class</Label>
                        <Select value={callForm.targetClass} onValueChange={(value) => {
                          const sections = Array.from(new Set(studentRecords.filter((s) => String(s.class || '') === value).map((s) => String(s.section || '')).filter(Boolean))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
                          setCallForm((current) => ({ ...current, targetClass: value, targetSection: sections[0] || '' }));
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select class" />
                          </SelectTrigger>
                          <SelectContent>
                            {classOptions.map((className) => (
                              <SelectItem key={className} value={className}>
                                {className}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Section</Label>
                        <Select
                          value={callForm.targetSection}
                          onValueChange={(value) => setCallForm((current) => ({ ...current, targetSection: value }))}
                          disabled={!callForm.targetClass}
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
                        <div className="flex min-h-12 flex-wrap gap-2 rounded-lg border border-slate-200 p-3">
                          {callForm.selectedGroups.length > 0 ? (
                            callForm.selectedGroups.map((group) => (
                              <Badge key={group} variant="secondary" className="cursor-pointer" onClick={() => toggleGroupSelection(group)}>
                                {group}
                              </Badge>
                            ))
                          ) : (
                            <p className="text-sm text-slate-500">No class-section groups selected yet.</p>
                          )}
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="call-subject">Campaign Title</Label>
                  <Input
                    id="call-subject"
                    value={callForm.subject}
                    onChange={(event) => setCallForm((current) => ({ ...current, subject: event.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="call-content">Call Notes</Label>
                  <Textarea
                    id="call-content"
                    rows={5}
                    value={callForm.content}
                    onChange={(event) => setCallForm((current) => ({ ...current, content: event.target.value }))}
                    placeholder="Optional notes for this call batch"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Audio Attachment (optional)</Label>
                  <div className="flex items-center gap-3 rounded-lg border border-dashed border-slate-300 p-4">
                    <Upload className="h-5 w-5 text-slate-400" />
                    <div className="flex-1">
                      <input
                        ref={audioInputRef}
                        id="audio-file"
                        type="file"
                        accept=".mp3,.wav,.ogg,.m4a,.aac"
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null;
                          if (file) {
                            if (file.size > 50 * 1024 * 1024) {
                              toast.error('Audio file must not exceed 50 MB');
                              event.target.value = '';
                              setAudioFile(null);
                              return;
                            }
                            setAudioFile(file);
                          } else {
                            setAudioFile(null);
                          }
                        }}
                        className="hidden"
                      />
                      <label htmlFor="audio-file" className="cursor-pointer text-sm font-medium text-slate-700 hover:text-blue-600">
                        {audioFile ? audioFile.name : 'Choose audio file'}
                      </label>
                      <p className="text-xs text-slate-500">MP3, WAV, OGG, M4A, AAC (max 50 MB). Sent as push notification audio.</p>
                    </div>
                    {audioFile && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => { setAudioFile(null); if (audioInputRef.current) audioInputRef.current.value = ''; }}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                  <Bell className="h-5 w-5 text-blue-600" />
                  <div className="flex-1">
                    <label htmlFor="send-notification" className="text-sm font-medium text-slate-700">
                      Send Push Notification
                    </label>
                    <p className="text-xs text-slate-500">Deliver this voice call as a push notification with audio playback on mobile.</p>
                  </div>
                  <Checkbox
                    id="send-notification"
                    checked={sendNotification}
                    onCheckedChange={(checked) => setSendNotification(checked === true)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="call-scheduled-for">Schedule For Later</Label>
                  <Input
                    id="call-scheduled-for"
                    type="datetime-local"
                    value={callForm.scheduledFor}
                    onChange={(event) => setCallForm((current) => ({ ...current, scheduledFor: event.target.value }))}
                  />
                  <p className="text-xs text-slate-500">Leave blank to start calls immediately. Future-dated entries are saved as scheduled records.</p>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowCallDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Start Call
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-500">Scheduled</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{scheduledCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-500">Completed / Partial</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{completedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-500">Failed / Cancelled</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{missedCount}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-blue-600" />
              Call history
            </CardTitle>
            <CardDescription>Saved history of Smartflo voice-call requests sent from the backend.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {calls.length > 0 ? (
              <>
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Scheduled For</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sentPaginatedCalls.map((call) => (
                        <TableRow key={call.id}>
                          <TableCell className="max-w-[220px] whitespace-normal font-medium text-slate-900">{call.subject}</TableCell>
                          <TableCell className="max-w-[220px] whitespace-normal text-slate-600">{call.to}</TableCell>
                          <TableCell className="max-w-[360px] whitespace-normal text-slate-600">{call.preview}</TableCell>
                          <TableCell className="text-slate-500">{call.scheduledFor}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                call.status === 'Completed'
                                  ? 'secondary'
                                  : call.status === 'Failed' || call.status === 'Cancelled'
                                    ? 'destructive'
                                    : 'outline'
                              }
                            >
                              {call.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setViewingCall(call)}>
                                <Eye className="h-4 w-4" />
                                View
                              </Button>
                              {call.status === 'Scheduled' ? (
                                <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => handleCancelCall(call.id)}>
                                  <X className="h-4 w-4" />
                                  Cancel
                                </Button>
                              ) : null}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                                onClick={() => handleDeleteCall(call.id)}
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
                    Showing {(sentCurrentPage - 1) * sentRowsPerPage + 1} to {Math.min(sentCurrentPage * sentRowsPerPage, calls.length)} of {calls.length} calls
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
              <p className="text-sm text-slate-500">No voice call requests created yet.</p>
            )}
          </CardContent>
        </Card>

        <Dialog open={Boolean(viewingCall)} onOpenChange={(open) => !open && setViewingCall(null)}>
          <DialogContent className="max-h-[90vh] w-[95vw] max-w-3xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Voice call details</DialogTitle>
              <DialogDescription>Review the saved call request, recipients, provider metadata, and attached audio.</DialogDescription>
            </DialogHeader>

            {viewingCall ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Campaign</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">{viewingCall.subject}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">{viewingCall.status}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recipients</p>
                    <p className="mt-2 text-sm text-slate-900">{viewingCall.to}</p>
                    <p className="mt-1 text-xs text-slate-500">{viewingCall.recipientCount} recipient(s)</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Scheduled For</p>
                    <p className="mt-2 text-sm text-slate-900">{viewingCall.scheduledFor}</p>
                    {viewingCall.sentAt ? <p className="mt-1 text-xs text-slate-500">Sent at {viewingCall.sentAt}</p> : null}
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Provider</p>
                    <p className="mt-2 text-sm text-slate-900">{viewingCall.providerName || 'Not recorded'}</p>
                    {viewingCall.providerReference ? <p className="mt-1 break-all text-xs text-slate-500">{viewingCall.providerReference}</p> : null}
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Audio</p>
                    <p className="mt-2 text-sm text-slate-900">{viewingCall.audioFileName || 'No audio file attached'}</p>
                    {viewingCall.audioUrl ? (
                      <a href={viewingCall.audioUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-sm font-medium text-blue-600 hover:text-blue-700">
                        Open audio
                      </a>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{viewingCall.preview}</p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recipient Phones</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {viewingCall.recipientPhones.length > 0 ? (
                      viewingCall.recipientPhones.map((phone) => (
                        <Badge key={phone} variant="secondary">
                          {phone}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">No phone list recorded.</p>
                    )}
                  </div>
                </div>

                {viewingCall.errorMessage ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-red-600">Error Details</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-red-700">{viewingCall.errorMessage}</p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-emerald-600" />
              Smartflo Notes
            </CardTitle>
            <CardDescription>This page now uses the backend Smartflo integration.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {[
              'Immediate submissions call Smartflo right away.',
              'Future-dated entries are saved as scheduled records.',
              'Recipient phones are resolved from staff phones and student contact numbers.',
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PhoneCall className="h-5 w-5 text-indigo-600" />
              Available Data
            </CardTitle>
            <CardDescription>Backend recipient pools currently available for Smartflo calls.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-900">Staff with active records</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{staffRecords.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-900">Students with active records</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{studentRecords.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
