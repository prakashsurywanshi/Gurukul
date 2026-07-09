import { FormEvent, useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { Activity, Eye, Loader2, MessageSquare, Phone, Plus, PowerOff, QrCode, RefreshCw, Trash2 } from 'lucide-react';
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

interface BridgeStatus {
  configured: boolean;
  connected: boolean;
  status: string;
  bridgeStatus?: string | null;
  session?: string | null;
  accountNumber?: string | null;
  qrCode?: string | null;
  message?: string | null;
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

interface SendWhatsappProps {
  user: any;
  staffRecords: Array<{ id: string; name: string; phone: string | null; role: string }>;
  studentRecords: Array<{ id: string; name: string; phone: string | null; class: string; section: string }>;
  whatsappHistory: Array<{
    id: string;
    to: string;
    subject: string;
    content: string;
    time: string;
    status: string;
    recipientCount: number;
    recipientNumbers: string[];
    accountNumber?: string | null;
    bridgeSession?: string | null;
    successfulCount?: number;
    failedCount?: number;
    pendingCount?: number;
    recipients?: Array<{ name?: string; phone?: string; status?: string; scheduled_at?: string | null; sent_at?: string | null; failed_reason?: string | null }>;
    responses: Array<{ phone?: string; name?: string; success?: boolean; message?: string }>;
  }>;
  bridgeStatus: BridgeStatus;
  queueWorkerStatus: QueueWorkerStatus;
}

type AudienceType = 'staff' | 'students' | 'class_section';

const roleLabels: Record<string, string> = {
  admin: 'Admins',
  teacher: 'Teachers',
  receptionist: 'Receptionists',
  accountant: 'Accountants',
  librarian: 'Librarians',
  staff: 'All Staff',
};

export default function SendWhatsapp({ user, staffRecords, studentRecords, whatsappHistory, bridgeStatus: initialBridgeStatus, queueWorkerStatus: initialQueueWorkerStatus }: SendWhatsappProps) {
  const page = usePage<{ flash?: { success?: string; error?: string }; errors?: Record<string, string> }>();
  const flash = page.props.flash ?? {};
  const validationErrors = page.props.errors ?? {};
  const [showComposeDialog, setShowComposeDialog] = useState(false);
  const [showSetup, setShowSetup] = useState(true);
  const [historyCurrentPage, setHistoryCurrentPage] = useState(1);
  const [viewingHistory, setViewingHistory] = useState<SendWhatsappProps['whatsappHistory'][number] | null>(null);
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus>(initialBridgeStatus);
  const [queueWorkerStatus, setQueueWorkerStatus] = useState<QueueWorkerStatus>(initialQueueWorkerStatus);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const historyRowsPerPage = 10;
  const [composeForm, setComposeForm] = useState({
    audienceType: 'students' as AudienceType,
    staffRole: 'teacher',
    selectedStaffRoles: [] as string[],
    targetClass: '',
    targetSection: '',
    selectedGroups: [] as string[],
    subject: '',
    content: '',
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
    if (validationErrors.whatsapp_recipients) {
      toast.error(validationErrors.whatsapp_recipients);
    }

    if (validationErrors.whatsapp_delivery) {
      toast.error(validationErrors.whatsapp_delivery);
    }
  }, [validationErrors.whatsapp_delivery, validationErrors.whatsapp_recipients]);

  const fetchBridgeStatus = async (silent = false) => {
    if (!silent) {
      setIsRefreshingStatus(true);
    }

    try {
      const response = await fetch('/communication/send-whatsapp/status', {
        headers: {
          Accept: 'application/json',
        },
        credentials: 'same-origin',
      });

      const data = await response.json();

      setBridgeStatus(data);
      if (data.queueWorkerStatus) {
        setQueueWorkerStatus(data.queueWorkerStatus);
      }
    } catch (error) {
      if (!silent) {
        toast.error('Could not refresh WhatsApp bridge status.');
      }
    } finally {
      if (!silent) {
        setIsRefreshingStatus(false);
      }
    }
  };

  useEffect(() => {
    const interval = window.setInterval(() => {
      void fetchBridgeStatus(true);
    }, 8000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const hasActiveCampaign = whatsappHistory.some((message) => ['Queued', 'Processing'].includes(message.status));

    if (!hasActiveCampaign) {
      return;
    }

    const interval = window.setInterval(() => {
      router.reload({ only: ['whatsappHistory'], preserveScroll: true, preserveState: true });
    }, 12000);

    return () => window.clearInterval(interval);
  }, [whatsappHistory]);

  const handleDisconnect = async () => {
    setIsDisconnecting(true);

    try {
      const response = await axios.post('/communication/send-whatsapp/disconnect', {});
      const data = response.data;

      toast.success(data.message || 'WhatsApp disconnected successfully.');
      await fetchBridgeStatus(true);
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Could not disconnect WhatsApp.';

      toast.error(message);
    } finally {
      setIsDisconnecting(false);
    }
  };

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
    return Array.from(new Set(studentRecords.filter((student) => student.phone).map((student) => `${student.class}-${student.section}`))).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    );
  }, [studentRecords]);

  const staffRoleOptions = useMemo(
    () => Array.from(new Set(staffRecords.filter((staff) => staff.phone).map((staff) => String(staff.role)).filter(Boolean))).sort(),
    [staffRecords]
  );

  const historyTotalPages = Math.max(1, Math.ceil(whatsappHistory.length / historyRowsPerPage));
  const paginatedHistory = useMemo(() => {
    const startIndex = (historyCurrentPage - 1) * historyRowsPerPage;
    return whatsappHistory.slice(startIndex, startIndex + historyRowsPerPage);
  }, [historyCurrentPage, whatsappHistory]);

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
      '/communication/send-whatsapp',
      {
        audienceType: composeForm.audienceType,
        selectedStaffRoles: composeForm.selectedStaffRoles,
        selectedGroups: composeForm.selectedGroups,
        subject: composeForm.subject,
        content: composeForm.content,
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

  const handleDeleteHistory = (messageId: string) => {
    if (!window.confirm('Delete this WhatsApp history entry?')) {
      return;
    }

    router.delete(`/communication/send-whatsapp/${messageId}`, {
      preserveScroll: true,
      onSuccess: () => {
        setHistoryCurrentPage(1);
        setViewingHistory(null);
      },
    });
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
    <DashboardLayout user={user} activeTab="send-whatsapp">
      <div className="space-y-6 p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold text-slate-900">Send Whatsapp</h1>
            <p className="mt-1 text-slate-600">Scan the QR code, connect a WhatsApp account, and send bulk updates to staff or student groups.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => setShowSetup((current) => !current)}>
              {showSetup ? 'Hide Setup' : 'Show Setup'}
            </Button>
            <Dialog open={showComposeDialog} onOpenChange={setShowComposeDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Whatsapp
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] w-[95vw] max-w-2xl overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Compose WhatsApp message</DialogTitle>
                  <DialogDescription>Send a WhatsApp message to staff, all students, or selected class and section groups.</DialogDescription>
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
                          <Select value={composeForm.targetClass} onValueChange={(value) => setComposeForm((current) => ({ ...current, targetClass: value, targetSection: '' }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select class" />
                            </SelectTrigger>
                            <SelectContent>
                              {classOptions.map((schoolClass) => (
                                <SelectItem key={schoolClass} value={schoolClass}>
                                  Class {schoolClass}
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
                          {classSectionGroups.length > 0 ? (
                            <div className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-2">
                              {classSectionGroups.map((group) => (
                                <label key={group} className="flex items-center gap-2 text-sm text-slate-700">
                                  <Checkbox checked={composeForm.selectedGroups.includes(group)} onCheckedChange={() => toggleGroupSelection(group)} />
                                  <span>{group.replace('-', ' - Section ')}</span>
                                </label>
                              ))}
                            </div>
                          ) : (
                            <p className="rounded-lg border border-dashed border-slate-200 p-3 text-sm text-slate-500">No class and section groups with phone numbers are available.</p>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 md:col-span-2">
                        This message will go to all students with an available phone number.
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="whatsapp-subject">Subject</Label>
                    <Input id="whatsapp-subject" value={composeForm.subject} onChange={(event) => setComposeForm((current) => ({ ...current, subject: event.target.value }))} required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="whatsapp-content">Message</Label>
                    <Textarea id="whatsapp-content" rows={5} value={composeForm.content} onChange={(event) => setComposeForm((current) => ({ ...current, content: event.target.value }))} required />
                  </div>

                  {!bridgeStatus.connected ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                      WhatsApp is currently disconnected. Scan the QR code in the setup section before sending.
                    </div>
                  ) : null}

                  <div className="flex justify-end">
                    <Button type="submit" className="gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Send WhatsApp
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
              <CardDescription>Live state from the WhatsApp bridge.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Badge variant={bridgeStatus.connected ? 'default' : 'secondary'}>{bridgeStatus.connected ? 'Connected' : 'Disconnected'}</Badge>
                <span className="text-xs uppercase tracking-wide text-slate-500">{bridgeStatus.bridgeStatus || bridgeStatus.status}</span>
              </div>
              <p className="mt-4 text-2xl font-semibold text-slate-900">{bridgeStatus.accountNumber || 'Not connected'}</p>
              <p className="mt-1 text-sm text-slate-500">Connected WhatsApp account number</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Bridge Session</CardTitle>
              <CardDescription>Current bridge session used for QR and sending.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="break-all text-sm font-medium text-slate-800">{bridgeStatus.session || 'Session will be created when setup loads.'}</p>
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
              <CardTitle className="text-base">Sent WhatsApp</CardTitle>
              <CardDescription>Total messages sent from this page.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-slate-900">{whatsappHistory.length}</p>
            </CardContent>
          </Card>
        </div>

        {showSetup ? (
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle>Whatsapp Bridge Setup</CardTitle>
                  <CardDescription>Use the QR code below to connect the bridge to your WhatsApp account.</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" className="gap-2" onClick={() => void fetchBridgeStatus()} disabled={isRefreshingStatus}>
                    {isRefreshingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Refresh
                  </Button>
                  <Button type="button" variant="outline" className="gap-2" onClick={() => void handleDisconnect()} disabled={isDisconnecting || !bridgeStatus.session}>
                    {isDisconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PowerOff className="h-4 w-4" />}
                    Disconnect
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!bridgeStatus.configured ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  WhatsApp bridge configuration is missing. Add the bridge URL to your environment before using this page.
                </div>
              ) : bridgeStatus.connected ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
                  <div className="flex items-start gap-3">
                    <Phone className="mt-0.5 h-5 w-5 text-emerald-600" />
                    <div>
                      <p className="font-semibold text-emerald-900">WhatsApp is connected</p>
                      <p className="mt-1 text-sm text-emerald-700">
                        Messages will be sent from <span className="font-medium">{bridgeStatus.accountNumber || 'the connected account'}</span>.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
                  <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                    {bridgeStatus.qrCode ? (
                      <img src={bridgeStatus.qrCode} alt="WhatsApp QR code" className="h-64 w-64 rounded-xl border border-slate-200 bg-white object-contain p-3" />
                    ) : (
                      <div className="space-y-3 text-center text-slate-500">
                        <QrCode className="mx-auto h-12 w-12" />
                        <p className="text-sm">QR code is being prepared. Refresh in a few seconds if it does not appear yet.</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-sm font-semibold text-slate-900">How to connect</p>
                      <ol className="mt-2 space-y-2 text-sm text-slate-600">
                        <li>1. Open WhatsApp on the phone you want to connect.</li>
                        <li>2. Go to Linked Devices and scan this QR code.</li>
                        <li>3. Wait for the status above to change to Connected.</li>
                      </ol>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                      <p className="font-medium text-slate-900">Bridge note</p>
                      <p className="mt-1">{bridgeStatus.message || 'The page keeps polling the bridge and will update automatically after the QR is scanned.'}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Sent History</CardTitle>
            <CardDescription>Recent WhatsApp messages sent through the connected bridge.</CardDescription>
          </CardHeader>
          <CardContent>
            {whatsappHistory.length > 0 ? (
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
                          <TableCell className="max-w-[360px] whitespace-normal text-slate-600">{message.content}</TableCell>
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
                            <div className="flex justify-end gap-2">
                              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setViewingHistory(message)}>
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

                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>
                    Showing {(historyCurrentPage - 1) * historyRowsPerPage + 1} to {Math.min(historyCurrentPage * historyRowsPerPage, whatsappHistory.length)} of {whatsappHistory.length} messages
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
                <p className="text-sm text-slate-500">No WhatsApp messages sent yet.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={Boolean(viewingHistory)} onOpenChange={(open) => !open && setViewingHistory(null)}>
          <DialogContent className="max-h-[90vh] w-[95vw] max-w-3xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>WhatsApp history details</DialogTitle>
              <DialogDescription>Review the saved WhatsApp message, recipients, and delivery metadata.</DialogDescription>
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
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Connected Account</p>
                    <p className="mt-2 text-sm text-slate-900">{viewingHistory.accountNumber || 'Not recorded'}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bridge Session</p>
                    <p className="mt-2 break-all text-sm text-slate-900">{viewingHistory.bridgeSession || 'Not recorded'}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Message</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{viewingHistory.content}</p>
                </div>

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
