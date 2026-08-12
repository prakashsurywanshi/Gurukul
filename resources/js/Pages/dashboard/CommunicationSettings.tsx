import { FormEvent, useEffect, useState } from 'react';
import axios from 'axios';
import { Bot, Loader2, Mail, MessageCircle, MessageSquare, Pencil, PhoneCall, RefreshCw, Save } from 'lucide-react';
import { router, usePage } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';

interface CommunicationSettingsProps {
  user: any;
  communicationSettings?: typeof defaultFormData | null;
}

const defaultFormData = {
  sms: {
    enabled: true,
    provider: 'MSG91',
    senderId: 'GURUKL',
    apiKey: '',
  },
  email: {
    enabled: true,
    mailer: 'SMTP',
    host: 'smtp.gmail.com',
    port: '587',
    username: 'school@example.com',
    fromAddress: 'noreply@gurukul.com',
    fromName: 'Gurukul ERP',
  },
  whatsapp: {
    enabled: false,
    provider: 'Twilio',
    phoneNumberId: '',
    accessToken: '',
    businessNumber: '+91 98765 43210',
  },
  voice: {
    enabled: false,
    provider: 'Smartflo',
    apiKey: '',
    callerId: '',
    ringTimeout: 30,
    callTimeout: 60,
  },
  qwa: {
    enabled: false,
    baseUrl: 'https://qwa.qodeigence.com',
    apiKey: '',
    sessionId: '',
    webhookUrl: '',
    webhookSecret: '',
  },
};

export default function CommunicationSettings({ user, communicationSettings }: CommunicationSettingsProps) {
  const flash = (usePage().props as any).flash ?? {};
  const [isEditing, setIsEditing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [formData, setFormData] = useState({
    ...defaultFormData,
    ...(communicationSettings ?? {}),
  });

  useEffect(() => {
    setFormData({
      ...defaultFormData,
      ...(communicationSettings ?? {}),
    });
  }, [communicationSettings]);

  useEffect(() => {
    if (flash.success) {
      setSuccessMessage(flash.success);
    }

    if (flash.error) {
      setErrorMessage(flash.error);
    }
  }, [flash.error, flash.success]);

  const updateSection = (
    section: 'sms' | 'email' | 'whatsapp' | 'voice' | 'qwa',
    field: string,
    value: string | boolean | number
  ) => {
    setFormData((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value,
      },
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSuccessMessage('');
    setErrorMessage('');

    router.patch('/settings/communication', formData, {
      preserveScroll: true,
      onSuccess: () => {
        setIsEditing(false);
      },
    });
  };

  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; message: string } | null>(null);

  const handleValidateQwa = async () => {
    setValidating(true);
    setValidationResult(null);

    try {
      const csrfToken = decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? '');
      const response = await axios.post(
        '/settings/communication/qwa/validate',
        {
          baseUrl: formData.qwa.baseUrl,
          apiKey: formData.qwa.apiKey,
          sessionId: formData.qwa.sessionId,
        },
        { headers: { 'X-XSRF-TOKEN': csrfToken } }
      );

      setValidationResult(response.data);
    } catch (error) {
      setValidationResult({
        valid: false,
        message: 'Unable to reach the QWA server. Check the base URL and try again.',
      });
    } finally {
      setValidating(false);
    }
  };

  const [checkingQwaStatus, setCheckingQwaStatus] = useState(false);
  const [startingQwaSession, setStartingQwaSession] = useState(false);
  const [qwaQrCode, setQwaQrCode] = useState<string | null>(null);
  const [qwaPolling, setQwaPolling] = useState(false);
  const [qwaStatus, setQwaStatus] = useState<{
    connected: boolean;
    status: string;
    statusLabel: string;
    phone?: string | null;
    pushName?: string | null;
    lastError?: string | null;
    message?: string | null;
  } | null>(null);

  const fetchQwaSessionStatus = async (silent = false) => {
    if (!silent) {
      setCheckingQwaStatus(true);
    }

    try {
      const csrfToken = decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? '');
      const response = await axios.post(
        '/settings/communication/qwa/status',
        {
          baseUrl: formData.qwa.baseUrl,
          apiKey: formData.qwa.apiKey,
          sessionId: formData.qwa.sessionId,
        },
        { headers: { 'X-XSRF-TOKEN': csrfToken } }
      );

      setQwaStatus(response.data);

      if (response.data.connected) {
        setQwaPolling(false);
      }

      return response.data;
    } catch (error) {
      if (!silent) {
        setQwaStatus({
          connected: false,
          status: 'error',
          statusLabel: 'Error',
          phone: null,
          pushName: null,
          lastError: 'Unable to reach the QWA server. Check the base URL and try again.',
          message: 'Unable to reach the QWA server.',
        });
      }

      return null;
    } finally {
      if (!silent) {
        setCheckingQwaStatus(false);
      }
    }
  };

  const handleCheckQwaStatus = async () => {
    await fetchQwaSessionStatus();
  };

  const handleStartQwaSession = async () => {
    setStartingQwaSession(true);
    setQwaStatus(null);
    setQwaQrCode(null);

    try {
      const csrfToken = decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? '');
      const response = await axios.post(
        '/settings/communication/qwa/start',
        {
          baseUrl: formData.qwa.baseUrl,
          apiKey: formData.qwa.apiKey,
          sessionId: formData.qwa.sessionId,
        },
        { headers: { 'X-XSRF-TOKEN': csrfToken } }
      );

      const data = response.data;

      setQwaStatus({
        connected: data.connected ?? false,
        status: data.status,
        statusLabel: data.statusLabel,
        phone: data.phone,
        pushName: data.pushName,
        lastError: data.lastError,
        message: data.message,
      });
      setQwaQrCode(data.qrCode ?? null);

      if (!data.connected) {
        setQwaPolling(true);
      }
    } catch (error) {
      setQwaStatus({
        connected: false,
        status: 'error',
        statusLabel: 'Error',
        phone: null,
        pushName: null,
        lastError: 'Unable to start the QWA session. Check the base URL and API key and try again.',
        message: 'Unable to start the QWA session.',
      });
    } finally {
      setStartingQwaSession(false);
    }
  };

  useEffect(() => {
    if (!qwaPolling) {
      return;
    }

    const interval = window.setInterval(() => {
      void fetchQwaSessionStatus(true);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [qwaPolling]);

  const qwaStatusStyle = (() => {
    if (!qwaStatus) return null;
    if (qwaStatus.connected) {
      return { dot: 'bg-green-500', text: 'text-green-800', box: 'border-green-200 bg-green-50' };
    }
    if (qwaStatus.statusLabel === 'Connecting') {
      return { dot: 'bg-amber-500', text: 'text-amber-800', box: 'border-amber-200 bg-amber-50' };
    }
    if (qwaStatus.statusLabel === 'Failed') {
      return { dot: 'bg-red-500', text: 'text-red-800', box: 'border-red-200 bg-red-50' };
    }
    return { dot: 'bg-slate-400', text: 'text-slate-700', box: 'border-slate-200 bg-slate-50' };
  })();

  return (
    <DashboardLayout user={user} activeTab="communication-settings">
      <div className="min-h-full bg-slate-50 p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Communication Setting</h1>
              <p className="mt-1 text-sm text-slate-600">Configure SMS, Email, and WhatsApp communication channels from one place.</p>
            </div>
            <Button
              type="button"
              variant={isEditing ? 'outline' : 'default'}
              onClick={() => {
                setSuccessMessage('');
                setErrorMessage('');
                setIsEditing((current) => !current);
              }}
            >
              <Pencil className="h-4 w-4" />
              {isEditing ? 'Cancel Edit' : 'Edit Setting'}
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {successMessage && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                {successMessage}
              </div>
            )}

            {errorMessage && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {errorMessage}
              </div>
            )}

            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                  <div>
                    <CardTitle>SMS Settings</CardTitle>
                    <CardDescription>Configure transactional and alert SMS delivery.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                  <div>
                    <p className="font-medium text-slate-900">Enable SMS</p>
                    <p className="text-sm text-slate-500">Turn SMS notifications on or off.</p>
                  </div>
                  <Switch checked={formData.sms.enabled} disabled={!isEditing} onCheckedChange={(checked) => updateSection('sms', 'enabled', checked)} />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>SMS Provider</Label>
                    <Input value={formData.sms.provider} disabled={!isEditing} onChange={(event) => updateSection('sms', 'provider', event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Sender ID</Label>
                    <Input value={formData.sms.senderId} disabled={!isEditing} onChange={(event) => updateSection('sms', 'senderId', event.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input value={formData.sms.apiKey} disabled={!isEditing} onChange={(event) => updateSection('sms', 'apiKey', event.target.value)} placeholder="Enter SMS API key" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <div>
                    <CardTitle>Email Settings</CardTitle>
                    <CardDescription>Set up your outgoing mail server and sender identity.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                  <div>
                    <p className="font-medium text-slate-900">Enable Email</p>
                    <p className="text-sm text-slate-500">Control system-generated email notifications.</p>
                  </div>
                  <Switch checked={formData.email.enabled} disabled={!isEditing} onCheckedChange={(checked) => updateSection('email', 'enabled', checked)} />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Mailer</Label>
                    <Input value={formData.email.mailer} disabled={!isEditing} onChange={(event) => updateSection('email', 'mailer', event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Host</Label>
                    <Input value={formData.email.host} disabled={!isEditing} onChange={(event) => updateSection('email', 'host', event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Port</Label>
                    <Input value={formData.email.port} disabled={!isEditing} onChange={(event) => updateSection('email', 'port', event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input value={formData.email.username} disabled={!isEditing} onChange={(event) => updateSection('email', 'username', event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>From Address</Label>
                    <Input value={formData.email.fromAddress} disabled={!isEditing} onChange={(event) => updateSection('email', 'fromAddress', event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>From Name</Label>
                    <Input value={formData.email.fromName} disabled={!isEditing} onChange={(event) => updateSection('email', 'fromName', event.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <MessageCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <CardTitle>WhatsApp Settings</CardTitle>
                    <CardDescription>Manage business messaging settings for WhatsApp notifications.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                  <div>
                    <p className="font-medium text-slate-900">Enable WhatsApp</p>
                    <p className="text-sm text-slate-500">Use WhatsApp for reminders and parent communication.</p>
                  </div>
                  <Switch checked={formData.whatsapp.enabled} disabled={!isEditing} onCheckedChange={(checked) => updateSection('whatsapp', 'enabled', checked)} />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <Input value={formData.whatsapp.provider} disabled={!isEditing} onChange={(event) => updateSection('whatsapp', 'provider', event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Business Number</Label>
                    <Input value={formData.whatsapp.businessNumber} disabled={!isEditing} onChange={(event) => updateSection('whatsapp', 'businessNumber', event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number ID</Label>
                    <Input value={formData.whatsapp.phoneNumberId} disabled={!isEditing} onChange={(event) => updateSection('whatsapp', 'phoneNumberId', event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Access Token</Label>
                    <Input value={formData.whatsapp.accessToken} disabled={!isEditing} onChange={(event) => updateSection('whatsapp', 'accessToken', event.target.value)} placeholder="Enter WhatsApp access token" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <PhoneCall className="h-5 w-5 text-indigo-600" />
                  <div>
                    <CardTitle>Voice Call Settings</CardTitle>
                    <CardDescription>Configure Smartflo credentials for backend voice-call initiation.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                  <div>
                    <p className="font-medium text-slate-900">Enable Voice Calls</p>
                    <p className="text-sm text-slate-500">Use Smartflo for outbound click-to-call requests.</p>
                  </div>
                  <Switch checked={formData.voice.enabled} disabled={!isEditing} onCheckedChange={(checked) => updateSection('voice', 'enabled', checked)} />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <Input value={formData.voice.provider} disabled={!isEditing} onChange={(event) => updateSection('voice', 'provider', event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Caller ID</Label>
                    <Input value={formData.voice.callerId} disabled={!isEditing} onChange={(event) => updateSection('voice', 'callerId', event.target.value)} placeholder="e.g. 9180694XXXXX" />
                  </div>
                  <div className="space-y-2">
                    <Label>Customer Ring Timeout (sec)</Label>
                    <Input
                      type="number"
                      min={10}
                      max={30}
                      value={formData.voice.ringTimeout}
                      disabled={!isEditing}
                      onChange={(event) => updateSection('voice', 'ringTimeout', Number(event.target.value || 30))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Call Timeout (sec)</Label>
                    <Input
                      type="number"
                      min={10}
                      max={3600}
                      value={formData.voice.callTimeout}
                      disabled={!isEditing}
                      onChange={(event) => updateSection('voice', 'callTimeout', Number(event.target.value || 60))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input value={formData.voice.apiKey} disabled={!isEditing} onChange={(event) => updateSection('voice', 'apiKey', event.target.value)} placeholder="Enter Smartflo API key" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Bot className="h-5 w-5 text-fuchsia-600" />
                  <div>
                    <CardTitle>QWA Settings</CardTitle>
                    <CardDescription>Connect your QWA gateway to send WhatsApp messages through your own WhatsApp session.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                  <div>
                    <p className="font-medium text-slate-900">Enable QWA</p>
                    <p className="text-sm text-slate-500">Use QWA for WhatsApp messaging and notifications.</p>
                  </div>
                  <Switch checked={formData.qwa.enabled} disabled={!isEditing} onCheckedChange={(checked) => updateSection('qwa', 'enabled', checked)} />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Base URL</Label>
                    <Input value={formData.qwa.baseUrl} disabled={!isEditing} onChange={(event) => updateSection('qwa', 'baseUrl', event.target.value)} placeholder="https://qwa.qodeigence.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Session ID / Name</Label>
                    <Input value={formData.qwa.sessionId} disabled={!isEditing} onChange={(event) => updateSection('qwa', 'sessionId', event.target.value)} placeholder="e.g. my-bot or sess_123e4567..." />
                  </div>
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input type="password" value={formData.qwa.apiKey} disabled={!isEditing} onChange={(event) => updateSection('qwa', 'apiKey', event.target.value)} placeholder="Enter QWA X-API-Key" />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="mb-2 text-sm font-medium text-slate-900">Webhook Configuration (Optional)</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Webhook URL</Label>
                      <Input value={formData.qwa.webhookUrl} disabled={!isEditing} onChange={(event) => updateSection('qwa', 'webhookUrl', event.target.value)} placeholder="https://your-server.com/webhook" />
                    </div>
                    <div className="space-y-2">
                      <Label>Webhook Secret</Label>
                      <Input type="password" value={formData.qwa.webhookSecret} disabled={!isEditing} onChange={(event) => updateSection('qwa', 'webhookSecret', event.target.value)} placeholder="Enter webhook HMAC secret" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">Validate Configuration</p>
                      <p className="text-sm text-slate-500">Test the base URL and API key against the QWA server using the values above.</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0"
                      disabled={!isEditing || validating}
                      onClick={handleValidateQwa}
                    >
                      {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                      {validating ? 'Validating...' : 'Validate'}
                    </Button>
                  </div>

                  {validationResult && (
                    <div
                      className={`rounded-lg border p-3 text-sm ${
                        validationResult.valid
                          ? 'border-green-200 bg-green-50 text-green-800'
                          : 'border-red-200 bg-red-50 text-red-800'
                      }`}
                    >
                      {validationResult.message}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">Connection Status</p>
                      <p className="text-sm text-slate-500">Start the QWA WhatsApp session and scan the QR code to connect.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="shrink-0"
                        disabled={checkingQwaStatus}
                        onClick={handleCheckQwaStatus}
                      >
                        {checkingQwaStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        {checkingQwaStatus ? 'Checking...' : 'Check Status'}
                      </Button>
                      <Button
                        type="button"
                        className="shrink-0 gap-2"
                        disabled={startingQwaSession || checkingQwaStatus}
                        onClick={handleStartQwaSession}
                      >
                        {startingQwaSession ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                        {startingQwaSession ? 'Starting...' : 'Start Session'}
                      </Button>
                    </div>
                  </div>

                  {qwaStatus && qwaStatusStyle && (
                    <div className={`rounded-lg border p-3 text-sm ${qwaStatusStyle.box}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${qwaStatusStyle.dot}`} />
                        <span className={`font-semibold ${qwaStatusStyle.text}`}>{qwaStatus.statusLabel}</span>
                        <span className="text-xs uppercase tracking-wide text-slate-500">{qwaStatus.status}</span>
                        {qwaPolling ? (
                          <span className="ml-auto inline-flex items-center gap-1 text-xs text-slate-500">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Waiting for connection...
                          </span>
                        ) : null}
                      </div>
                      {qwaStatus.connected && (qwaStatus.phone || qwaStatus.pushName) ? (
                        <p className="mt-2 text-slate-700">
                          Connected WhatsApp account: <span className="font-medium">{qwaStatus.pushName || 'WhatsApp'}</span>
                          {qwaStatus.phone ? ` (${qwaStatus.phone})` : ''}
                        </p>
                      ) : null}
                      {qwaStatus.lastError ? <p className="mt-2 text-slate-600">{qwaStatus.lastError}</p> : null}
                      {qwaStatus.message && !qwaStatus.lastError ? <p className="mt-2 text-slate-600">{qwaStatus.message}</p> : null}
                    </div>
                  )}

                  {qwaQrCode ? (
                    <div className="grid gap-4 md:grid-cols-[240px,1fr]">
                      <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-3">
                        <img src={qwaQrCode} alt="QWA WhatsApp QR code" className="h-56 w-56 rounded-lg border border-slate-200 object-contain" />
                      </div>
                      <div className="space-y-2 text-sm text-slate-600">
                        <p className="font-semibold text-slate-900">How to connect</p>
                        <ol className="list-inside list-decimal space-y-1">
                          <li>Open WhatsApp on the phone you want to connect.</li>
                          <li>Go to <span className="font-medium">Linked Devices</span> and scan this QR code.</li>
                          <li>Wait for the status to change to <span className="font-medium">Connected</span>.</li>
                        </ol>
                        <p className="text-xs text-slate-500">The status refreshes automatically every few seconds while connecting.</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            {isEditing && (
              <div className="flex justify-end">
                <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700">
                  <Save className="h-4 w-4" />
                  Save Settings
                </Button>
              </div>
            )}
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
