import { useLanguage } from '../../i18n/LanguageProvider';
import { FormEvent, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { ArrowLeft, Mail, Pencil, Save } from 'lucide-react';

type SmtpSettings = {
    mailer: 'smtp' | 'sendmail' | 'mailgun';
    smtp_host: string;
    smtp_port: string;
    smtp_username: string;
    smtp_password: string;
    smtp_encryption: 'tls' | 'ssl' | 'none';
    from_name: string;
    from_email: string;
    reply_to_email: string;
    is_active: boolean;
};

export default function SuperAdminSmtpSettings({ smtpSettings }: { smtpSettings: SmtpSettings }) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<SmtpSettings>(smtpSettings);
    const [testEmail, setTestEmail] = useState(smtpSettings.from_email || '');

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
                        <h1 className="text-3xl font-bold">{t('SMTP Settings')}</h1>
                        <p className="text-gray-600 mt-1">
                            {t('Configure the global outgoing mail server for the super admin panel.')}
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        setFormData(smtpSettings);
                        setIsEditing((current) => !current);
                    }}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 ${isEditing ? 'border border-gray-300 text-gray-700 hover:bg-gray-50' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                >
                    <Pencil className="w-4 h-4" />
                    {isEditing ? t('Cancel Edit') : t('Edit SMTP')}
                </button>
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
                            <Mail className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">{t('Global Mail Configuration')}</h2>
                            <p className="text-sm text-gray-600">
                                {t('These settings are stored in the database and loaded for superadmin mail usage.')}
                            </p>
                        </div>
                    </div>
                </div>

                <form
                    onSubmit={(event: FormEvent<HTMLFormElement>) => {
                        event.preventDefault();
                        router.patch('/superadmin/smtp-settings', formData, {
                            preserveScroll: true,
                            onSuccess: () => setIsEditing(false),
                        });
                    }}
                    className="p-6 space-y-6"
                >
                    <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                        <div>
                            <p className="font-medium text-slate-900">{t('SMTP Active')}</p>
                            <p className="text-sm text-slate-500">
                                {t('Enable or disable the saved SMTP configuration.')}
                            </p>
                        </div>
                        <input
                            type="checkbox"
                            checked={formData.is_active}
                            disabled={!isEditing}
                            onChange={(event) =>
                                setFormData({
                                    ...formData,
                                    is_active: event.target.checked,
                                })
                            }
                            className="h-4 w-4"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label={t('Mailer')}>
                            <select
                                value={formData.mailer}
                                disabled={!isEditing}
                                onChange={(event) =>
                                    setFormData({
                                        ...formData,
                                        mailer: event.target.value as SmtpSettings['mailer'],
                                    })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            >
                                <option value="smtp">{t('SMTP')}</option>
                                <option value="sendmail">{t('Sendmail')}</option>
                                <option value="mailgun">{t('Mailgun')}</option>
                            </select>
                        </Field>
                        <Field label={t('Encryption')}>
                            <select
                                value={formData.smtp_encryption}
                                disabled={!isEditing}
                                onChange={(event) =>
                                    setFormData({
                                        ...formData,
                                        smtp_encryption: event.target.value as SmtpSettings['smtp_encryption'],
                                    })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            >
                                <option value="tls">{t('TLS')}</option>
                                <option value="ssl">{t('SSL')}</option>
                                <option value="none">{t('None')}</option>
                            </select>
                        </Field>
                        <Field label={t('SMTP Host')}>
                            <input
                                type="text"
                                value={formData.smtp_host}
                                disabled={!isEditing}
                                onChange={(event) =>
                                    setFormData({
                                        ...formData,
                                        smtp_host: event.target.value,
                                    })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                        </Field>
                        <Field label={t('SMTP Port')}>
                            <input
                                type="number"
                                value={formData.smtp_port}
                                disabled={!isEditing}
                                onChange={(event) =>
                                    setFormData({
                                        ...formData,
                                        smtp_port: event.target.value,
                                    })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                        </Field>
                        <Field label={t('SMTP Username')}>
                            <input
                                type="text"
                                value={formData.smtp_username}
                                disabled={!isEditing}
                                onChange={(event) =>
                                    setFormData({
                                        ...formData,
                                        smtp_username: event.target.value,
                                    })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                        </Field>
                        <Field label={t('SMTP Password')}>
                            <input
                                type="password"
                                value={formData.smtp_password}
                                disabled={!isEditing}
                                onChange={(event) =>
                                    setFormData({
                                        ...formData,
                                        smtp_password: event.target.value,
                                    })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                        </Field>
                        <Field label={t('From Name')}>
                            <input
                                type="text"
                                value={formData.from_name}
                                disabled={!isEditing}
                                onChange={(event) =>
                                    setFormData({
                                        ...formData,
                                        from_name: event.target.value,
                                    })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                        </Field>
                        <Field label={t('From Email')}>
                            <input
                                type="email"
                                value={formData.from_email}
                                disabled={!isEditing}
                                onChange={(event) =>
                                    setFormData({
                                        ...formData,
                                        from_email: event.target.value,
                                    })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                        </Field>
                        <div className="md:col-span-2">
                            <Field label={t('Reply-To Email')}>
                                <input
                                    type="email"
                                    value={formData.reply_to_email}
                                    disabled={!isEditing}
                                    onChange={(event) =>
                                        setFormData({
                                            ...formData,
                                            reply_to_email: event.target.value,
                                        })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                            </Field>
                        </div>
                    </div>

                    {isEditing && (
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                {t('Save SMTP Settings')}
                            </button>
                        </div>
                    )}
                </form>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold">{t('Send Test Email')}</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        {t('Enter an email address to verify the saved SMTP configuration.')}
                    </p>
                </div>

                <form
                    onSubmit={(event: FormEvent<HTMLFormElement>) => {
                        event.preventDefault();
                        router.post(
                            '/superadmin/smtp-settings/test',
                            { test_email: testEmail },
                            { preserveScroll: true },
                        );
                    }}
                    className="p-6"
                >
                    <div className="flex flex-col md:flex-row gap-3 items-start md:items-end">
                        <div className="w-full md:flex-1">
                            <Field label={t('Test Email Address')}>
                                <input
                                    type="email"
                                    value={testEmail}
                                    onChange={(event) => setTestEmail(event.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    placeholder="admin@example.com"
                                />
                            </Field>
                        </div>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                        >
                            {t('Send Test Email')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            {children}
        </div>
    );
}
