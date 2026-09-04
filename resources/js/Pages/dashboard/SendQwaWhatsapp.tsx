import { FormEvent, useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { Activity, Eye, Loader2, MessageSquare, Plus, QrCode, RefreshCw, Trash2 } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';

interface QwaStatus {
  configured: boolean;
  connected: boolean;
  status: string;
  statusLabel: string;
  sessionId?: string | null;
  phone?: string | null;
  pushName?: string | null;
  message?: string | null;
  qrCode?: string | null;
  started?: boolean;
}

interface QueueWorkerStatus {
  running: boolean | null;
  processCount: number;
  queue: string;
  pendingJobs?: number | null;
  reservedJobs?: number | null;
  checkedAt?: string | null;
  message?: string | null;
}

interface SendQwaWhatsappProps {
  user: any;
  staffRecords: Array<{ id: string; name: string; phone: string | null; role: string }>;
  studentRecords: Array<{ id: string; name: string; phone: string | null; class: string; section: string }>;
  qwaHistory: Array<{
    id: string;
    to: string;
    subject: string;
    content: string;
    time: string;
    status: string;
    recipientCount: number;
    recipientNumbers: string[];
    sessionId?: string | null;
    messageType?: string;
    mediaFilename?: string | null;
    mediaCaption?: string | null;
    mediaUrl?: string | null;
    successfulCount?: number;
    failedCount?: number;
    pendingCount?: number;
    recipients?: Array<{ name?: string; phone?: string; status?: string; scheduled_at?: string | null; sent_at?: string | null; failed_reason?: string | null }>;
    responses: Array<{ phone?: string; name?: string; success?: boolean; message?: string }>;
  }>;
  qwaStatus: QwaStatus;
  queueWorkerStatus: QueueWorkerStatus;
}

type AudienceType = 'staff' | 'students' | 'class_section';
type MessageType = 'text' | 'photo' | 'audio' | 'document';

const roleLabels: Record<string, string> = {
  admin: 'Admins',
  teacher: 'Teachers',
  receptionist: 'Receptionists',
  accountant: 'Accountants',
  librarian: 'Librarians',
  staff: 'All Staff',
};

const messageTypeLabels: Record<MessageType, string> = {
  text: 'Text',
  photo: 'Photo',
  audio: 'Audio',
  document: 'Document',
};

const messageTypeAccepts: Record<MessageType, string> = {
  text: '',
  photo: 'image/*',
  audio: 'audio/*',
  document: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv',
};

export default function SendQwaWhatsapp({ user, staffRecords, studentRecords, qwaHistory, qwaStatus: initialQwaStatus, queueWorkerStatus: initialQueueWorkerStatus }: SendQwaWhatsappProps) {
  const page = usePage<{ flash?: { success?: string; error?: string }; errors?: Record<string, string> }>();
  const flash = page.props.flash ?? {};
  const validationErrors = page.props.errors ?? {};
  const [showComposeDialog, setShowComposeDialog] = useState(false);
  const [historyCurrentPage, setHistoryCurrentPage] = useState(1);
  const [viewingHistory, setViewingHistory] = useState<SendQwaWhatsappProps['qwaHistory'][number] | null>(null);
  const [qwaStatus, setQwaStatus] = useState<QwaStatus>(initialQwaStatus);
  const [queueWorkerStatus, setQueueWorkerStatus] = useState<QueueWorkerStatus>(initialQueueWorkerStatus);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
  const historyRowsPerPage = 10;
  const [fileInputKey, setFileInputKey] = useState(0);
  const [composeForm, setComposeForm] = useState({
    audienceType: 'students' as AudienceType,
    staffRole: 'teacher',
    selectedStaffRoles: [] as string[],
    targetClass: '',
    targetSection: '',
    selectedGroups: [] as string[],
    subject: '',
    content: '',
    messageType: 'text' as MessageType,
    mediaFile: null as File | null,
    mediaCaption: '',
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
    if (validationErrors.qwa_recipients) {
      toast.error(validationErrors.qwa_recipients);
    }

    if (validationErrors.qwa_delivery) {
      toast.error(validationErrors.qwa_delivery);
    }
  }, [validationErrors.qwa_delivery, validationErrors.qwa_recipients]);

  const fetchQwaStatus = async (silent = false) => {
    if (!silent) {
      setIsRefreshingStatus(true);
    }

    try {
      const response = await fetch('/communication/send-qwa-whatsapp/status', {
        headers: {
          Accept: 'application/json',
        },
        credentials: 'same-origin',
      });

      const data = await response.json();

      setQwaStatus(data);
      if (data.queueWorkerStatus) {
        setQueueWorkerStatus(data.queueWorkerStatus);
      }
    } catch (error) {
      if (!silent) {
        toast.error('Could not refresh QWA WhatsApp status.');
      }
    } finally {
      if (!silent) {
        setIsRefreshingStatus(false);
      }
    }
  };

  useEffect(() => {
    const interval = window.setInterval(() => {
      void fetchQwaStatus(true);
    }, 8000);

    return () => window.clearInterval(interval);
  }, []);

  const connectQwa = async () => {
    setIsRefreshingStatus(true);

    try {
      const csrfToken = decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? '');
      const response = await axios.post(
        '/communication/send-qwa-whatsapp/connect',
        {},
        { headers: { 'X-XSRF-TOKEN': csrfToken } }
      );
      const data = response.data;

      setQwaStatus(data);
      if (data.queueWorkerStatus) {
        setQueueWorkerStatus(data.queueWorkerStatus);
      }

      if (data.message) {
        if (data.connected) {
          toast.success(data.message);
        } else if (data.qrCode) {
          toast.info('Scan the QR code with WhatsApp to connect.');
        } else {
          toast.error(data.message);
        }
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Could not refresh or start the QWA session.';
      toast.error(message);
    } finally {
      setIsRefreshingStatus(false);
    }
  };

  useEffect(() => {
    const hasActiveCampaign = qwaHistory.some((message) => ['Queued', 'Processing', 'Partial'].includes(message.status));

    if (!hasActiveCampaign) {
      return;
    }

    const interval = window.setInterval(() => {
      router.reload({ only: ['qwaHistory'], preserveScroll: true, preserveState: true });
    }, 12000);

    return () => window.clearInterval(interval);
  }, [qwaHistory]);

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

  const staffRoleOptions = useMemo(
    () => Array.from(new Set(staffRecords.filter((staff) => staff.phone).map((staff) => String(staff.role)).filter(Boolean))).sort(),
    [staffRecords]
  );

  const historyTotalPages = Math.max(1, Math.ceil(qwaHistory.length / historyRowsPerPage));
  const paginatedHistory = useMemo(() => {
    const startIndex = (historyCurrentPage - 1) * historyRowsPerPage;
    return qwaHistory.slice(startIndex, startIndex + historyRowsPerPage);
  }, [historyCurrentPage, qwaHistory]);

  useEffect(() => {
    setHistoryCurrentPage((current) => Math.min(current, historyTotalPages));
  }, [historyTotalPages]);

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
      messageType: 'text',
      mediaFile: null,
      mediaCaption: '',
    });
    setFileInputKey((current) => current + 1);
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

    if (composeForm.messageType !== 'text' && !composeForm.mediaFile) {
      toast.error('Select a media file to send');
      return;
    }

    router.post(
      '/communication/send-qwa-whatsapp',
      {
        audienceType: composeForm.audienceType,
        selectedStaffRoles: composeForm.selectedStaffRoles,
        selectedGroups: composeForm.selectedGroups,
        subject: composeForm.subject,
        content: composeForm.content,
        messageType: composeForm.messageType,
        mediaFile: composeForm.mediaFile ?? undefined,
        mediaCaption: composeForm.mediaCaption,
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

  const handleDeleteHistory = (messageId: string) => {
    if (!window.confirm('Delete this QWA WhatsApp history entry?')) {
      return;
    }

    router.delete(`/communication/send-qwa-whatsapp/${messageId}`, {
      preserveScroll: true,
      onSuccess: () => {
        setHistoryCurrentPage(1);
        setViewingHistory(null);
      },
    });
  };

  const handleResendHistory = (message: SendQwaWhatsappProps['qwaHistory'][number]) => {
    const count = message.recipientCount ?? message.recipientNumbers.length;
    const target = count === 1 ? '1 recipient' : `${count} recipients`;

    if (!window.confirm(`Resend this QWA WhatsApp message to ${target}?`)) {
      return;
    }

    router.post(`/communication/send-qwa-whatsapp/${message.id}/resend`, {}, {
      preserveScroll: true,
    });
  };

  const statusBadgeVariant = qwaStatus.connected ? 'default' : qwaStatus.configured ? 'secondary' : 'secondary';

  return (
    <DashboardLayout user={user} activeTab="send-qwa-whatsapp">
      <div className="space-y-6 p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold text-slate-900">Send QWA Whatsapp</h1>
            <p className="mt-1 text-slate-600">Send bulk WhatsApp updates through the QWA gateway to staff or student groups.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" className="gap-2" onClick={() => void connectQwa()} disabled={isRefreshingStatus}>
              {isRefreshingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh Status
            </Button>
            <Dialog open={showComposeDialog} onOpenChange={setShowComposeDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  New QWA Whatsapp
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] w-[95vw] max-w-2xl overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Compose QWA WhatsApp message</DialogTitle>
                  <DialogDescription>Send a WhatsApp message to staff, all students, or selected class and section groups via QWA.</DialogDescription>
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
                          <div className="flex gap-2">
                            <Select value={composeForm.staffRole} onValueChange={(value) => setComposeForm((current) => ({ ...current, staffRole: value }))}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a role" />
                              </SelectTrigger>
                              <SelectContent>
                                {staffRoleOptions.map((role) => (
                                  <SelectItem key={role} value={role}>
                                    {roleLabels[role] ?? role}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button type="button" variant="outline" onClick={addSelectedStaffRole}>
                              Add
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Selected Staff Groups</Label>
                          {composeForm.selectedStaffRoles.length > 0 ? (
                            <div className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-2">
                              {composeForm.selectedStaffRoles.map((role) => (
                                <label key={role} className="flex items-center gap-2 text-sm text-slate-700">
                                  <Checkbox checked onCheckedChange={() => toggleStaffRoleSelection(role)} />
                                  <span>{roleLabels[role] ?? role}</span>
                                </label>
                              ))}
                            </div>
                          ) : (
                            <p className="rounded-lg border border-dashed border-slate-200 p-3 text-sm text-slate-500">No staff group selected yet.</p>
                          )}
                        </div>
                      </>
                    ) : composeForm.audienceType === 'class_section' ? (
                      <>
                        <div className="space-y-2">
                          <Label>Class</Label>
                          <Select
                            value={composeForm.targetClass}
                            onValueChange={(value) => {
                              const sections = Array.from(new Set(studentRecords.filter((s) => String(s.class) === value).map((s) => String(s.section)).filter(Boolean))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
                              setComposeForm((current) => ({ ...current, targetClass: value, targetSection: sections[0] || '' }));
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select class" />
                            </SelectTrigger>
                            <SelectContent>
                              {classOptions.map((schoolClass) => (
                                <SelectItem key={schoolClass} value={schoolClass}>
                                  {schoolClass}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Section</Label>
                          <div className="flex gap-2">
                            <Select
                              value={composeForm.targetSection}
                              onValueChange={(value) => setComposeForm((current) => ({ ...current, targetSection: value }))}
                              disabled={!composeForm.targetClass}
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
                            <Button type="button" variant="outline" onClick={addSelectedGroup}>
                              Add
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Selected Groups</Label>
                          <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 p-3">
                            {composeForm.selectedGroups.length > 0 ? (
                              composeForm.selectedGroups.map((group) => (
                                <Badge key={group} variant="secondary" className="cursor-pointer" onClick={() => toggleGroupSelection(group)}>
                                  {group.replace('-', ' - Section ')}
                                </Badge>
                              ))
                            ) : (
                              <p className="text-sm text-slate-500">No class-section groups selected yet.</p>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 md:col-span-2">
                        This message will go to all students with an available phone number.
                      </div>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Message Type</Label>
                      <Select
                        value={composeForm.messageType}
                        onValueChange={(value: MessageType) =>
                          setComposeForm((current) => ({
                            ...current,
                            messageType: value,
                            mediaFile: value === 'text' ? null : current.mediaFile,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="photo">Photo</SelectItem>
                          <SelectItem value="audio">Audio</SelectItem>
                          <SelectItem value="document">Document</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="qwa-subject">Subject</Label>
                      <Input id="qwa-subject" value={composeForm.subject} onChange={(event) => setComposeForm((current) => ({ ...current, subject: event.target.value }))} required />
                    </div>

                    {composeForm.messageType !== 'text' ? (
                      <>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="qwa-media">Media File ({messageTypeLabels[composeForm.messageType]})</Label>
                          <Input
                            key={fileInputKey}
                            id="qwa-media"
                            type="file"
                            accept={messageTypeAccepts[composeForm.messageType]}
                            onChange={(event) => setComposeForm((current) => ({ ...current, mediaFile: event.target.files?.[0] ?? null }))}
                            required
                          />
                          {composeForm.mediaFile ? (
                            <p className="text-sm text-slate-500">
                              Selected: <span className="font-medium text-slate-700">{composeForm.mediaFile.name}</span> (
                              {(composeForm.mediaFile.size / 1024).toFixed(0)} KB)
                            </p>
                          ) : null}
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="qwa-media-caption">Caption (optional)</Label>
                          <Textarea
                            id="qwa-media-caption"
                            rows={2}
                            value={composeForm.mediaCaption}
                            onChange={(event) => setComposeForm((current) => ({ ...current, mediaCaption: event.target.value }))}
                            placeholder="Caption shown with the media in WhatsApp"
                          />
                        </div>
                      </>
                    ) : null}

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="qwa-content">{composeForm.messageType === 'text' ? 'Message' : 'Message (optional)'}</Label>
                      <Textarea
                        id="qwa-content"
                        rows={5}
                        value={composeForm.content}
                        onChange={(event) => setComposeForm((current) => ({ ...current, content: event.target.value }))}
                        required={composeForm.messageType === 'text'}
                      />
                    </div>
                  </div>

                  {!qwaStatus.connected ? (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                      QWA WhatsApp is currently disconnected. Start the QWA session and scan the QR code from Communication Settings before sending.
                    </div>
                  ) : null}

                  <div className="flex justify-end">
                    <Button type="submit" className="gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Send QWA Whatsapp
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Connection Status</CardTitle>
              <CardDescription>Live state from the QWA gateway.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Badge variant={statusBadgeVariant}>{qwaStatus.connected ? 'Connected' : qwaStatus.configured ? qwaStatus.statusLabel : 'Not Configured'}</Badge>
                <span className="text-xs uppercase tracking-wide text-slate-500">{qwaStatus.status}</span>
              </div>
              <p className="mt-4 text-2xl font-semibold text-slate-900">{qwaStatus.phone || 'No session connected'}</p>
              <p className="mt-1 text-sm text-slate-500">Connected WhatsApp number</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">QWA Session</CardTitle>
              <CardDescription>Session used to send messages.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="break-all text-sm font-medium text-slate-800">{qwaStatus.sessionId || 'No session configured.'}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4" />
                Queue Worker
              </CardTitle>
              <CardDescription>Status for artisan queue worker.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Badge variant={queueWorkerStatus.running ? 'default' : queueWorkerStatus.running === false ? 'destructive' : 'secondary'}>
                  {queueWorkerStatus.running ? 'Running' : queueWorkerStatus.running === false ? 'Stopped' : 'Unknown'}
                </Badge>
                <span className="text-xs uppercase tracking-wide text-slate-500">{queueWorkerStatus.queue || 'whatsapp'}</span>
              </div>
              <p className="mt-4 text-sm text-slate-600">{queueWorkerStatus.message || 'Queue worker status was checked.'}</p>
              {queueWorkerStatus.pendingJobs != null || queueWorkerStatus.reservedJobs != null ? (
                <p className="mt-2 text-xs text-slate-500">
                  {queueWorkerStatus.pendingJobs ?? 0} pending, {queueWorkerStatus.reservedJobs ?? 0} processing
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Sent QWA Whatsapp</CardTitle>
              <CardDescription>Total messages sent from this page.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-slate-900">{qwaHistory.length}</p>
            </CardContent>
          </Card>
        </div>

        {!qwaStatus.configured ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            QWA is not configured. Open{' '}
            <span className="font-semibold">Settings &gt; Communication Settings &gt; QWA Settings</span>, add the Base URL, API key and Session ID, then validate the
            connection and start the session.
          </div>
        ) : !qwaStatus.connected ? (
          <div className="space-y-4">
            {qwaStatus.qrCode ? (
              <Card>
                <CardHeader>
                  <CardTitle>Connect WhatsApp</CardTitle>
                  <CardDescription>Scan this QR code with WhatsApp to link the QWA session and start sending.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
                    <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                      <img src={qwaStatus.qrCode} alt="QWA WhatsApp QR code" className="h-64 w-64 rounded-xl border border-slate-200 bg-white object-contain p-3" />
                    </div>
                    <div className="space-y-4">
                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="text-sm font-semibold text-slate-900">How to connect</p>
                        <ol className="mt-2 space-y-2 text-sm text-slate-600">
                          <li>1. Open WhatsApp on the phone you want to connect.</li>
                          <li>2. Go to Linked Devices and scan this QR code.</li>
                          <li>3. Wait for the status to change to Connected.</li>
                        </ol>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                        <p className="font-medium text-slate-900">Session status</p>
                        <p className="mt-1">{qwaStatus.statusLabel} — the page refreshes automatically and will start sending once connected.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                QWA is configured but not connected yet (status: {qwaStatus.statusLabel}). Click{' '}
                <span className="font-semibold">Refresh Status</span> to start the session — a QR code will appear here to scan.
              </div>
            )}
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Sent History</CardTitle>
            <CardDescription>Recent WhatsApp messages sent through the QWA gateway.</CardDescription>
          </CardHeader>
          <CardContent>
            {qwaHistory.length > 0 ? (
              <div className="space-y-4">
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>Recipients</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Sent At</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedHistory.map((message) => (
                        <TableRow key={message.id}>
                          <TableCell className="max-w-[220px] whitespace-normal font-medium text-slate-900">{message.subject}</TableCell>
                          <TableCell className="max-w-[220px] whitespace-normal text-slate-600">{message.to}</TableCell>
                          <TableCell className="max-w-[360px] whitespace-normal text-slate-600">
                            {message.messageType && message.messageType !== 'text' ? (
                              <Badge variant="outline" className="mb-1">
                                {messageTypeLabels[(message.messageType as MessageType)] ?? message.messageType}
                              </Badge>
                            ) : null}
                            {message.content || (message.mediaFilename ? <span className="italic text-slate-400">{message.mediaFilename}</span> : null)}
                          </TableCell>
                          <TableCell className="text-slate-500">{message.time}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Badge variant={message.status === 'Failed' ? 'destructive' : 'secondary'}>{message.status}</Badge>
                              {message.status === 'Queued' || message.status === 'Processing' || message.status === 'Partial' ? (
                                <p className="text-xs text-slate-500">
                                  {message.successfulCount ?? 0} sent, {message.failedCount ?? 0} failed, {message.pendingCount ?? 0} pending
                                </p>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button type="button" variant="outline" size="icon" title="View" onClick={() => setViewingHistory(message)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button type="button" variant="outline" size="icon" title="Resend" onClick={() => handleResendHistory(message)}>
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                title="Delete"
                                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                onClick={() => handleDeleteHistory(message.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>
                    Showing {(historyCurrentPage - 1) * historyRowsPerPage + 1} to {Math.min(historyCurrentPage * historyRowsPerPage, qwaHistory.length)} of {qwaHistory.length} messages
                  </span>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setHistoryCurrentPage((current) => Math.max(1, current - 1))} disabled={historyCurrentPage === 1}>
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setHistoryCurrentPage((current) => Math.min(historyTotalPages, current + 1))}
                      disabled={historyCurrentPage === historyTotalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center">
                <p className="text-sm text-slate-500">No QWA WhatsApp messages sent yet.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={Boolean(viewingHistory)} onOpenChange={(open) => !open && setViewingHistory(null)}>
          <DialogContent className="max-h-[90vh] w-[95vw] max-w-3xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>QWA WhatsApp history details</DialogTitle>
              <DialogDescription>Review the saved QWA WhatsApp message, recipients, and delivery metadata.</DialogDescription>
            </DialogHeader>

            {viewingHistory ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Subject</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">{viewingHistory.subject}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">{viewingHistory.status}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recipients</p>
                    <p className="mt-2 text-sm text-slate-900">{viewingHistory.to}</p>
                    <p className="mt-1 text-xs text-slate-500">{viewingHistory.recipientCount} recipient(s)</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {viewingHistory.successfulCount ?? 0} sent, {viewingHistory.failedCount ?? 0} failed, {viewingHistory.pendingCount ?? 0} pending
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sent At</p>
                    <p className="mt-2 text-sm text-slate-900">{viewingHistory.time}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">QWA Session</p>
                    <p className="mt-2 break-all text-sm text-slate-900">{viewingHistory.sessionId || 'Not recorded'}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Message Type</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {viewingHistory.messageType ? (messageTypeLabels[viewingHistory.messageType as MessageType] ?? viewingHistory.messageType) : 'Text'}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Message</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{viewingHistory.content || 'No text message attached.'}</p>
                </div>

                {viewingHistory.mediaFilename ? (
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Media</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">{viewingHistory.mediaFilename}</p>
                    {viewingHistory.mediaCaption ? <p className="mt-1 text-sm text-slate-600">{viewingHistory.mediaCaption}</p> : null}
                    {viewingHistory.mediaUrl ? (
                      <a href={viewingHistory.mediaUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-medium text-blue-600 hover:underline">
                        Open media file
                      </a>
                    ) : null}
                  </div>
                ) : null}

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recipient Numbers</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(viewingHistory.recipients?.length ?? 0) > 0 ? (
                      viewingHistory.recipients?.map((recipient, index) => (
                        <Badge key={`${recipient.phone || 'recipient'}-${index}`} variant={recipient.status === 'failed' ? 'destructive' : 'secondary'}>
                          {recipient.phone} {recipient.status ? `(${recipient.status})` : ''}
                        </Badge>
                      ))
                    ) : viewingHistory.recipientNumbers.length > 0 ? (
                      viewingHistory.recipientNumbers.map((phone) => (
                        <Badge key={phone} variant="secondary">
                          {phone}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">No recipient numbers recorded.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Delivery Responses</p>
                  <div className="mt-3 space-y-3">
                    {viewingHistory.responses.length > 0 ? (
                      viewingHistory.responses.map((response, index) => (
                        <div key={`${response.phone || 'response'}-${index}`} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
                          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                            <p className="font-medium text-slate-900">{response.name || response.phone || `Recipient ${index + 1}`}</p>
                            <Badge variant={response.success ? 'secondary' : 'destructive'}>{response.success ? 'Success' : 'Failed'}</Badge>
                          </div>
                          {response.phone ? <p className="mt-1 text-slate-600">{response.phone}</p> : null}
                          {response.message ? <p className="mt-2 text-slate-600">{response.message}</p> : null}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">No delivery responses recorded.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
