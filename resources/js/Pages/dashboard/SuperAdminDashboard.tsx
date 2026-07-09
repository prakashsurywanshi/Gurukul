import { useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Activity, Building2, Edit, Eye, LogIn, Plus, Search, Trash2, TrendingUp, Users } from 'lucide-react';
import { OrganizationDetails } from './OrganizationDetails';
import { formatDate } from '../ui/utils';

type OrganizationRecord = {
  id: number;
  name: string;
  slug: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country?: string;
  pincode: string;
  website?: string | null;
  logo?: string | null;
  subscription_plan: 'free' | 'basic' | 'premium' | 'enterprise';
  subscription_status: 'active' | 'inactive' | 'suspended';
  subscription_start_date?: string | null;
  subscription_end_date?: string | null;
  max_students: number;
  created_at: string;
  settings?: {
    academic_year_start?: string;
    currency?: string;
    timezone?: string;
  } | null;
  admin_user?: {
    id: number;
    name: string;
    email: string;
    status: 'active' | 'inactive';
  } | null;
  stats?: {
    total_users: number;
    total_students: number;
  };
};

export default function SuperAdminDashboard({
  organizations,
  viewMode = 'dashboard',
}: {
  organizations: OrganizationRecord[];
  viewMode?: 'dashboard' | 'organizations';
}) {
  const flash = (usePage().props as any).flash ?? {};
  const [searchQuery, setSearchQuery] = useState('');
  const [activeForm, setActiveForm] = useState<'create' | 'edit' | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<OrganizationRecord | null>(null);
  const [viewingOrgId, setViewingOrgId] = useState<number | null>(null);

  const viewingOrganization = useMemo(
    () => organizations.find((organization) => organization.id === viewingOrgId) || null,
    [organizations, viewingOrgId]
  );

  if (viewingOrgId) {
    return (
      <OrganizationDetails
        organization={viewingOrganization}
        onBack={() => setViewingOrgId(null)}
        onEdit={() => {
          setSelectedOrg(viewingOrganization);
          setViewingOrgId(null);
          setActiveForm('edit');
        }}
      />
    );
  }

  const filteredOrganizations = organizations.filter((org) =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalOrgs = organizations.length;
  const activeOrgs = organizations.filter((org) => org.subscription_status === 'active').length;
  const suspendedOrgs = organizations.filter((org) => org.subscription_status === 'suspended').length;
  const totalStudents = organizations.reduce((sum, org) => sum + (org.stats?.total_students || 0), 0);
  const totalStaff = organizations.reduce((sum, org) => sum + (org.stats?.total_users || 0), 0);
  const isOrganizationsView = viewMode === 'organizations';
  const nearingExpiryOrganizations = organizations
    .filter((org) => org.subscription_end_date)
    .sort((first, second) => String(first.subscription_end_date).localeCompare(String(second.subscription_end_date)))
    .slice(0, 5);
  const topCapacityOrganizations = [...organizations]
    .sort((first, second) => (second.stats?.total_students || 0) - (first.stats?.total_students || 0))
    .slice(0, 5);
  const planBreakdown = [
    { label: 'Enterprise', value: organizations.filter((org) => org.subscription_plan === 'enterprise').length, tone: 'bg-purple-100 text-purple-700' },
    { label: 'Premium', value: organizations.filter((org) => org.subscription_plan === 'premium').length, tone: 'bg-blue-100 text-blue-700' },
    { label: 'Basic', value: organizations.filter((org) => org.subscription_plan === 'basic').length, tone: 'bg-green-100 text-green-700' },
    { label: 'Free', value: organizations.filter((org) => org.subscription_plan === 'free').length, tone: 'bg-slate-100 text-slate-700' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{isOrganizationsView ? 'Organizations' : 'Super Admin Dashboard'}</h1>
          <p className="text-gray-600 mt-1">
            {isOrganizationsView ? 'Create, review, and manage all school organizations.' : 'Track platform-level organization and student activity.'}
          </p>
        </div>
        {isOrganizationsView && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setSelectedOrg(null);
                setActiveForm('create');
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Organization
            </button>
          </div>
        )}
      </div>

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

      {!isOrganizationsView && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard title="Total Organizations" value={String(totalOrgs)} icon={<Building2 className="w-6 h-6 text-blue-600" />} color="bg-blue-100" />
            <StatCard title="Active Organizations" value={String(activeOrgs)} icon={<Activity className="w-6 h-6 text-green-600" />} color="bg-green-100" />
            <StatCard title="Total Students" value={String(totalStudents)} icon={<Users className="w-6 h-6 text-purple-600" />} color="bg-purple-100" />
            <StatCard title="Total Staff" value={String(totalStaff)} icon={<TrendingUp className="w-6 h-6 text-orange-600" />} color="bg-orange-100" />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Schools Nearing Expiry</h2>
                  <p className="mt-1 text-sm text-gray-500">Review subscription dates to identify schools that may need follow-up soon.</p>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                  {nearingExpiryOrganizations.length} tracked
                </span>
              </div>

              <div className="mt-6 space-y-3">
                {nearingExpiryOrganizations.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No school expiry data is available yet.</div>
                ) : (
                  nearingExpiryOrganizations.map((org) => (
                    <div key={org.id} className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                      <div>
                        <p className="font-semibold text-slate-900">{org.name}</p>
                        <p className="mt-1 text-sm text-slate-500">{org.city}, {org.state}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-slate-900">{formatDate(org.subscription_end_date, 'No expiry')}</p>
                        <p className="mt-1 text-xs text-slate-500">{org.subscription_plan.toUpperCase()} plan</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900">Plan Distribution</h2>
              <p className="mt-1 text-sm text-gray-500">See how schools are spread across subscription plans.</p>

              <div className="mt-6 space-y-3">
                {planBreakdown.map((plan) => (
                  <div key={plan.label} className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${plan.tone}`}>{plan.label}</span>
                    <span className="text-lg font-bold text-slate-900">{plan.value}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Suspended</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{suspendedOrgs}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Avg Students / School</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {totalOrgs > 0 ? Math.round(totalStudents / totalOrgs) : 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Top Schools by Student Count</h2>
                <p className="mt-1 text-sm text-gray-500">A quick operational snapshot of the largest schools on the platform.</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {topCapacityOrganizations.map((org) => (
                <div key={org.id} className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900">{org.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{org.city}, {org.state}</p>
                    </div>
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                      {org.subscription_status.toUpperCase()}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Students</p>
                      <p className="mt-2 text-xl font-bold text-slate-900">{org.stats?.total_students || 0}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Staff</p>
                      <p className="mt-2 text-xl font-bold text-slate-900">{org.stats?.total_users || 0}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isOrganizationsView && (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search organizations by name, city, or slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      )}

      {activeForm === 'create' && (
        <OrganizationForm
          mode="create"
          onClose={() => setActiveForm(null)}
          onSave={(payload) => {
            router.post('/superadmin/organizations', payload, {
              preserveScroll: true,
              onSuccess: () => setActiveForm(null),
            });
          }}
        />
      )}

      {activeForm === 'edit' && selectedOrg && (
        <OrganizationForm
          mode="edit"
          organization={selectedOrg}
          onClose={() => {
            setActiveForm(null);
            setSelectedOrg(null);
          }}
          onSave={(payload) => {
            router.patch(`/superadmin/organizations/${selectedOrg.id}`, payload, {
              preserveScroll: true,
              onSuccess: () => {
                setActiveForm(null);
                setSelectedOrg(null);
              },
            });
          }}
        />
      )}

      {isOrganizationsView && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Max Students</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredOrganizations.map((org) => (
                  <tr key={org.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{org.name}</div>
                        <div className="text-sm text-gray-500">{org.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{org.city}</div>
                      <div className="text-sm text-gray-500">{org.state}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{formatDate(org.subscription_end_date, 'No expiry')}</td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          org.subscription_status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : org.subscription_status === 'suspended'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {org.subscription_status.toUpperCase()}
                        </span>
                        <p className="text-xs text-gray-500">Created: {formatDate(org.created_at, 'No expiry')}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{org.max_students}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setSelectedOrg(org);
                          setActiveForm('edit');
                        }}
                        className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this organization?')) {
                            router.delete(`/superadmin/organizations/${org.id}`, { preserveScroll: true });
                          }
                        }}
                        className="text-red-600 hover:text-red-800 inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setViewingOrgId(org.id)}
                        className="text-gray-600 hover:text-gray-800 inline-flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          const adminLabel = org.admin_user?.name || 'the school admin';

                          if (confirm(`View ${org.name} as ${adminLabel}?`)) {
                            router.post(`/superadmin/organizations/${org.id}/impersonate`, {}, { preserveScroll: true });
                          }
                        }}
                        className="text-emerald-600 hover:text-emerald-800 inline-flex items-center gap-1 disabled:text-gray-300 disabled:hover:text-gray-300"
                        disabled={!org.admin_user}
                        title={org.admin_user ? `View as ${org.admin_user.name}` : 'No school admin available'}
                      >
                        <LogIn className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredOrganizations.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No organizations found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
        </div>
        <div className={`${color} p-3 rounded-lg`}>
          {icon}
        </div>
      </div>
    </div>
  );
}


function OrganizationForm({
  mode,
  organization,
  onClose,
  onSave,
}: {
  mode: 'create' | 'edit';
  organization?: OrganizationRecord;
  onClose: () => void;
  onSave: (payload: {
    name: string;
    slug: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
    email: string;
    subscription_plan: 'free' | 'basic' | 'premium' | 'enterprise';
    subscription_status: 'active' | 'inactive' | 'suspended';
    subscription_end_date: string;
    max_students: number;
    password?: string;
  }) => void;
}) {
  const errors = (usePage().props as any).errors ?? {};
  const [formData, setFormData] = useState({
    name: organization?.name || '',
    slug: organization?.slug || '',
    address: organization?.address || '',
    city: organization?.city || '',
    state: organization?.state || '',
    pincode: organization?.pincode || '',
    phone: organization?.phone || '',
    email: organization?.email || '',
    subscription_plan: organization?.subscription_plan || 'basic',
    subscription_status: organization?.subscription_status || 'active',
    subscription_end_date: organization?.subscription_end_date || '',
    max_students: organization?.max_students || 100,
    password: '',
  });

  return (
    <div className="w-full md:w-[50vw] max-w-[50vw] ml-auto bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-2">{mode === 'create' ? 'Create New Organization' : 'Edit Organization'}</h2>
        <p className="text-sm text-gray-600 mb-6">
          {mode === 'create' ? 'Add a new organization directly from this page.' : 'Update the selected organization without leaving the page.'}
        </p>

        {Object.keys(errors).length > 0 && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {Object.values(errors)[0] as string}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(formData);
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Organization Name *">
              <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </Field>
            <Field label="Slug *">
              <input type="text" required value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </Field>
            <div className="md:col-span-2">
              <Field label="Address *">
                <input type="text" required value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </Field>
            </div>
            <Field label="City *">
              <input type="text" required value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </Field>
            <Field label="State *">
              <input type="text" required value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </Field>
            <Field label="Pincode *">
              <input type="text" required value={formData.pincode} onChange={(e) => setFormData({ ...formData, pincode: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </Field>
            <Field label="Phone *">
              <input type="tel" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </Field>
            <Field label="Email *">
              <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </Field>
            {mode === 'create' && (
              <Field label="Admin Password *">
                <input
                  type="password"
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </Field>
            )}
            <Field label="Subscription Plan *">
              <select value={formData.subscription_plan} onChange={(e) => setFormData({ ...formData, subscription_plan: e.target.value as any })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="free">Free</option>
                <option value="basic">Basic</option>
                <option value="premium">Premium</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </Field>
            <Field label="Status *">
              <select value={formData.subscription_status} onChange={(e) => setFormData({ ...formData, subscription_status: e.target.value as any })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </Field>
            <Field label="Plan Expiry Date *">
              <input
                type="date"
                required
                value={formData.subscription_end_date}
                onChange={(e) => setFormData({ ...formData, subscription_end_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </Field>
            <Field label="Max Students *">
              <input type="number" required min="1" value={formData.max_students} onChange={(e) => setFormData({ ...formData, max_students: parseInt(e.target.value) || 1 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </Field>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              {mode === 'create' ? 'Create Organization' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
