import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Image as ImageIcon, Pencil, Save } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface SettingsProps {
  user: {
    organization_id?: number | null;
  };
  organization: {
    id: number;
    slug: string | null;
    name: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
    website: string | null;
    logo: string | null;
    settings?: {
      session?: string;
      sessions?: string[];
      date_format?: string;
    } | null;
  } | null;
  sessionRecords: {
    id: number;
    name: string;
    is_current: boolean;
  }[];
}

const defaultSettingsForm = {
  organizationCode: '',
  name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  website: '',
  academicSession: '',
  dateFormat: 'DD-MM-YYYY',
  logo: '',
};

const dateFormatOptions = ['DD-MM-YYYY', 'MM-DD-YYYY', 'YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY'];

export default function Settings({ user, organization, sessionRecords }: SettingsProps) {
  const page = usePage<{ flash?: { success?: string; error?: string }; activeSession?: string | null }>();
  const flash = page.props.flash ?? {};
  const activeSession = page.props.activeSession ?? null;
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(defaultSettingsForm);

  const availableSessions = useMemo(
    () => sessionRecords.map((session) => session.name),
    [sessionRecords]
  );
  const selectedAcademicSession = formData.academicSession
    || activeSession
    || sessionRecords.find((session) => session.is_current)?.name
    || organization?.settings?.session
    || '';

  useEffect(() => {
    setFormData({
      organizationCode: organization?.slug || '',
      name: organization?.name || '',
      email: organization?.email || '',
      phone: organization?.phone || '',
      address: organization?.address || '',
      city: organization?.city || '',
      state: organization?.state || '',
      pincode: organization?.pincode || '',
      website: organization?.website || '',
      academicSession: activeSession
        || sessionRecords.find((session) => session.is_current)?.name
        || organization?.settings?.session
        || '',
      dateFormat: organization?.settings?.date_format || defaultSettingsForm.dateFormat,
      logo: organization?.logo || '',
    });
  }, [activeSession, organization, sessionRecords]);

  const handleLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((current) => ({
        ...current,
        logo: typeof reader.result === 'string' ? reader.result : current.logo,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!organization) {
      return;
    }

    router.patch('/settings', {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      pincode: formData.pincode,
      website: formData.website,
      academicSession: formData.academicSession,
      dateFormat: formData.dateFormat,
      logo: formData.logo,
    }, {
      preserveScroll: true,
      onSuccess: () => {
        setIsEditing(false);
      },
    });
  };

  return (
    <DashboardLayout user={user} activeTab="settings">
      <div className="min-h-full bg-slate-50 p-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">General Setting</h1>
              <p className="mt-1 text-sm text-slate-600">
                Update your organization details, academic session, and format preferences from one place.
              </p>
            </div>
            <Button
              type="button"
              variant={isEditing ? 'outline' : 'default'}
              onClick={() => {
                setIsEditing((current) => !current);
              }}
            >
              <Pencil className="h-4 w-4" />
              {isEditing ? 'Cancel Edit' : 'Edit Setting'}
            </Button>
          </div>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>General Setting</CardTitle>
              <CardDescription>Keep your organization settings in a simple editable form.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {flash.success && (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                    {flash.success}
                  </div>
                )}

                {flash.error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    {flash.error}
                  </div>
                )}

                {!user.organization_id && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    No organization is linked to this admin account yet.
                  </div>
                )}

                {user.organization_id && !organization && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    Organization data could not be loaded. Refresh the page and try again.
                  </div>
                )}

                {organization && availableSessions.length === 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    No academic sessions were found in the database. Add one in Sessions first to choose it here.
                  </div>
                )}

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="organization-code">Organization Code</Label>
                    <Input id="organization-code" value={formData.organizationCode} disabled readOnly />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="school-name">School Name</Label>
                    <Input
                      id="school-name"
                      value={formData.name}
                      disabled={!isEditing}
                      onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="organization-email">Email</Label>
                    <Input
                      id="organization-email"
                      type="email"
                      value={formData.email}
                      disabled={!isEditing}
                      onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="organization-phone">Phone</Label>
                    <Input
                      id="organization-phone"
                      value={formData.phone}
                      disabled={!isEditing}
                      onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="organization-website">Website</Label>
                    <Input
                      id="organization-website"
                      value={formData.website}
                      disabled={!isEditing}
                      onChange={(event) => setFormData({ ...formData, website: event.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Academic Session</Label>
                    <Select
                      value={selectedAcademicSession}
                      onValueChange={(value) => setFormData({ ...formData, academicSession: value })}
                      disabled={!isEditing || availableSessions.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select academic session" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSessions.map((session) => (
                          <SelectItem key={session} value={session}>
                            {session}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedAcademicSession && (
                      <p className="text-xs text-slate-500">Current session: {selectedAcademicSession}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Date Format</Label>
                    <Select
                      value={formData.dateFormat}
                      onValueChange={(value) => setFormData({ ...formData, dateFormat: value })}
                      disabled={!isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select date format" />
                      </SelectTrigger>
                      <SelectContent>
                        {dateFormatOptions.map((format) => (
                          <SelectItem key={format} value={format}>
                            {format}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="school-address">Address</Label>
                  <Textarea
                    id="school-address"
                    value={formData.address}
                    disabled={!isEditing}
                    onChange={(event) => setFormData({ ...formData, address: event.target.value })}
                    rows={4}
                  />
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="organization-city">City</Label>
                    <Input
                      id="organization-city"
                      value={formData.city}
                      disabled={!isEditing}
                      onChange={(event) => setFormData({ ...formData, city: event.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="organization-state">State</Label>
                    <Input
                      id="organization-state"
                      value={formData.state}
                      disabled={!isEditing}
                      onChange={(event) => setFormData({ ...formData, state: event.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="organization-pincode">Pincode</Label>
                    <Input
                      id="organization-pincode"
                      value={formData.pincode}
                      disabled={!isEditing}
                      onChange={(event) => setFormData({ ...formData, pincode: event.target.value })}
                    />
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_180px]">
                  <div className="space-y-2">
                    <Label htmlFor="school-logo">School Logo</Label>
                    <Input
                      id="school-logo"
                      type="file"
                      accept="image/*"
                      disabled={!isEditing}
                      onChange={handleLogoChange}
                    />
                    <p className="text-xs text-slate-500">Upload a logo only when editing settings.</p>
                  </div>

                  <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                    {formData.logo ? (
                      <img
                        src={formData.logo}
                        alt="School logo preview"
                        className="max-h-28 max-w-full rounded-lg object-contain"
                      />
                    ) : (
                      <div className="text-center text-slate-500">
                        <ImageIcon className="mx-auto h-8 w-8" />
                        <p className="mt-2 text-sm">No logo</p>
                      </div>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="flex justify-end">
                    <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700">
                      <Save className="h-4 w-4" />
                      Save Settings
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
