import { useLanguage } from '../../i18n/LanguageProvider';
import { ArrowLeft, BookOpen, IndianRupee, Edit, GraduationCap, Users } from 'lucide-react';
import { formatDate } from '../ui/utils';

interface OrganizationRecord {
    id: number;
    name: string;
    slug: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    website?: string | null;
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
    stats?: {
        total_students: number;
        total_users: number;
    };
}

interface OrganizationDetailsProps {
    organization: OrganizationRecord | null;
    onBack: () => void;
    onEdit: () => void;
}

export function OrganizationDetails({ organization, onBack, onEdit }: OrganizationDetailsProps) {
    const { t } = useLanguage();
    if (!organization) {
        return (
            <div className="p-6">
                <p className="text-red-600">{t('Organization not found')}</p>
            </div>
        );
    }

    const studentUsage =
        organization.max_students > 0
            ? ((organization.stats?.total_students || 0) / organization.max_students) * 100
            : 0;

    return (
        <div className="space-y-6 p-6 pb-10">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold">{organization.name}</h1>
                        <p className="text-gray-600 mt-1">
                            {organization.city}, {organization.state}
                        </p>
                    </div>
                </div>
                <button
                    onClick={onEdit}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    <Edit className="w-4 h-4" />
                    {t('Edit Organization')}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm">{t('Total Students')}</p>
                            <p className="text-3xl font-bold mt-2">{organization.stats?.total_students || 0}</p>
                            <p className="text-sm text-gray-500 mt-1">
                                {t('of')}
                                {organization.max_students}
                                {t('capacity')}
                            </p>
                        </div>
                        <div className="bg-blue-100 p-3 rounded-lg">
                            <GraduationCap className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm">{t('Staff Members')}</p>
                            <p className="text-3xl font-bold mt-2">{organization.stats?.total_users || 0}</p>
                            <p className="text-sm text-gray-500 mt-1">{t('Active users')}</p>
                        </div>
                        <div className="bg-green-100 p-3 rounded-lg">
                            <Users className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm">{t('Subscription')}</p>
                            <p className="text-2xl font-bold mt-2 capitalize">{organization.subscription_plan}</p>
                            <p className="text-sm text-gray-500 mt-1">
                                <span
                                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                        organization.subscription_status === 'active'
                                            ? 'bg-green-100 text-green-800'
                                            : organization.subscription_status === 'suspended'
                                              ? 'bg-red-100 text-red-800'
                                              : 'bg-gray-100 text-gray-800'
                                    }`}
                                >
                                    {organization.subscription_status.toUpperCase()}
                                </span>
                            </p>
                        </div>
                        <div className="bg-purple-100 p-3 rounded-lg">
                            <IndianRupee className="w-6 h-6 text-purple-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm">{t('Member Since')}</p>
                            <p className="text-2xl font-bold mt-2">
                                {new Date(`${organization.created_at}T00:00:00`).getFullYear()}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                                {formatDate(organization.created_at, 'No expiry')}
                            </p>
                        </div>
                        <div className="bg-orange-100 p-3 rounded-lg">
                            <BookOpen className="w-6 h-6 text-orange-600" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h2 className="text-xl font-bold mb-4">{t('Contact Information')}</h2>
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-gray-600">{t('Email')}</p>
                            <p className="font-medium">{organization.email}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">{t('Phone')}</p>
                            <p className="font-medium">{organization.phone}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">{t('Website')}</p>
                            <p className="font-medium">{organization.website || t('Not provided')}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">{t('Address')}</p>
                            <p className="font-medium">
                                {organization.address}
                                <br />
                                {organization.city}, {organization.state} - {organization.pincode}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h2 className="text-xl font-bold mb-4">{t('Subscription Details')}</h2>
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-gray-600">{t('Plan')}</p>
                            <p className="font-medium capitalize">{organization.subscription_plan}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">{t('Status')}</p>
                            <span
                                className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                                    organization.subscription_status === 'active'
                                        ? 'bg-green-100 text-green-800'
                                        : organization.subscription_status === 'suspended'
                                          ? 'bg-red-100 text-red-800'
                                          : 'bg-gray-100 text-gray-800'
                                }`}
                            >
                                {organization.subscription_status.toUpperCase()}
                            </span>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">{t('Plan Expiry')}</p>
                            <p className="font-medium">{formatDate(organization.subscription_end_date, 'No expiry')}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">{t('Max Students')}</p>
                            <p className="font-medium">{organization.max_students}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">{t('Organization Slug')}</p>
                            <p className="font-medium font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                                {organization.slug}
                            </p>
                        </div>
                    </div>
                </div>

                {organization.settings && (
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <h2 className="text-xl font-bold mb-4">{t('Organization Settings')}</h2>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-gray-600">{t('Academic Year Start')}</p>
                                <p className="font-medium">{organization.settings.academic_year_start || '-'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">{t('Currency')}</p>
                                <p className="font-medium">{organization.settings.currency || '-'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">{t('Timezone')}</p>
                                <p className="font-medium">{organization.settings.timezone || '-'}</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h2 className="text-xl font-bold mb-4">{t('Usage Statistics')}</h2>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between mb-2">
                                <p className="text-sm text-gray-600">{t('Student Capacity')}</p>
                                <p className="text-sm font-medium">
                                    {organization.stats?.total_students || 0} / {organization.max_students}
                                </p>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full"
                                    style={{
                                        width: `${Math.min(studentUsage, 100)}%`,
                                    }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
