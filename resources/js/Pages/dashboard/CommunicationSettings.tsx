import { FormEvent, useEffect, useState } from 'react';
import { Mail, MessageCircle, MessageSquare, Pencil, PhoneCall, Save } from 'lucide-react';
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
    section: 'sms' | 'email' | 'whatsapp' | 'voice',
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
