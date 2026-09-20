import { useLanguage } from '../../i18n/LanguageProvider';
import { FormEvent, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { ArrowLeft, Eye, EyeOff, KeyRound, Pencil, Save } from 'lucide-react';

type IntegrationKeys = {
    biometric_sync_key: string;
    cctv_sync_key: string;
    transport_gps_sync_key: string;
};

export default function SuperAdminIntegrationKeys({ integrationKeys }: { integrationKeys: IntegrationKeys }) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const [isEditing, setIsEditing] = useState(false);
    const [showKeys, setShowKeys] = useState(false);
    const [formData, setFormData] = useState<IntegrationKeys>(integrationKeys);

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.visit('/dashboard')}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold">{t('Integration Keys')}</h1>
                        <p className="text-gray-600 mt-1">
                            {t('Configure global API keys used by device ingestion endpoints.')}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setShowKeys((current) => !current)}
                        className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                        {showKeys ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        {showKeys ? t('Hide Keys') : t('Show Keys')}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setFormData(integrationKeys);
                            setIsEditing((current) => !current);
                        }}
                        className={`px-4 py-2 rounded-lg flex items-center gap-2 ${isEditing ? 'border border-gray-300 text-gray-700 hover:bg-gray-50' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                    >
                        <Pencil className="w-4 h-4" />
                        {isEditing ? t('Cancel Edit') : t('Edit Keys')}
                    </button>
                </div>
            </div>

            {flash.success && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                    {flash.success}
                </div>
            )}

            {flash.error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{flash.error}</div>
            )}

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-3 rounded-lg">
                            <KeyRound className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">{t('Global Device Sync Keys')}</h2>
                            <p className="text-sm text-gray-600">
                                {t(
                                    'These keys are stored in the database and authenticate biometric, CCTV, and transport GPS ingestion endpoints. A stored key takes precedence over the environment variable.',
                                )}
                            </p>
                        </div>
                    </div>
                </div>

                <form
                    onSubmit={(event: FormEvent<HTMLFormElement>) => {
                        event.preventDefault();
                        router.patch('/superadmin/integration-keys', formData, {
                            preserveScroll: true,
                            onSuccess: () => setIsEditing(false),
                        });
                    }}
                    className="p-6 space-y-6"
                >
                    <div className="grid grid-cols-1 gap-4">
                        <KeyField
                            label={t('Biometric Sync Key')}
                            description={t('Accepted via the X-Biometric-Key request header.')}
                            value={formData.biometric_sync_key}
                            show={showKeys}
                            disabled={!isEditing}
                            onChange={(value) =>
                                setFormData({
                                    ...formData,
                                    biometric_sync_key: value,
                                })
                            }
                        />
                        <KeyField
                            label={t('CCTV Sync Key')}
                            description={t('Accepted via the X-Cctv-Key request header.')}
                            value={formData.cctv_sync_key}
                            show={showKeys}
                            disabled={!isEditing}
                            onChange={(value) =>
                                setFormData({
                                    ...formData,
                                    cctv_sync_key: value,
                                })
                            }
                        />
                        <KeyField
                            label={t('Transport GPS Sync Key')}
                            description={t('Accepted via the X-Transport-Key request header.')}
                            value={formData.transport_gps_sync_key}
                            show={showKeys}
                            disabled={!isEditing}
                            onChange={(value) =>
                                setFormData({
                                    ...formData,
                                    transport_gps_sync_key: value,
                                })
                            }
                        />
                    </div>

                    {isEditing && (
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                {t('Save Integration Keys')}
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}

function KeyField({
    label,
    description,
    value,
    show,
    disabled,
    onChange,
}: {
    label: string;
    description: string;
    value: string;
    show: boolean;
    disabled: boolean;
    onChange: (value: string) => void;
}) {
    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <input
                type={show ? 'text' : 'password'}
                value={value}
                placeholder="••••••••••••••••"
                disabled={disabled}
                onChange={(event) => onChange(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            <p className="text-xs text-gray-500">{description}</p>
        </div>
    );
}
