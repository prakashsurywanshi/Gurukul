import { useLanguage } from '../i18n/LanguageProvider';
import { Button } from './ui/button';
import SuperAdminDashboard from './dashboard/SuperAdminDashboard';
import SuperAdminKnowledgeBaseCms from './dashboard/SuperAdminKnowledgeBaseCms';
import SuperAdminSmtpSettings from './dashboard/SuperAdminSmtpSettings';
import { SuperAdminProfile } from './Profile';
import EditProfile from './EditProfile';
import { router } from '@inertiajs/react';
import { BookText, Building2, LayoutDashboard, Mail, PanelLeft, UserRound, X } from 'lucide-react';
import { useState } from 'react';

interface DashboardProps {
    user: any;
    organizations?: any[];
    smtpSettings?: any;
    knowledgeBaseContent?: any;
    superAdminView?:
        'dashboard' | 'organizations' | 'smtp-settings' | 'knowledge-base-cms' | 'profile' | 'profile-edit';
}

export default function Dashboard({
    user,
    organizations = [],
    smtpSettings = null,
    knowledgeBaseContent = null,
    superAdminView = 'dashboard',
}: DashboardProps) {
    const { t } = useLanguage();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const handleLogout = () => {
        if (confirm('Are you sure you want to logout?')) {
            router.post('/logout');
        }
    };

    const navigationItems: Array<{
        id: DashboardProps['superAdminView'];
        label: string;
        path: string;
        icon: any;
    }> = [
        {
            id: 'dashboard',
            label: 'Dashboard',
            path: '/dashboard',
            icon: LayoutDashboard,
        },
        {
            id: 'organizations',
            label: 'Organizations',
            path: '/superadmin/organizations',
            icon: Building2,
        },
        {
            id: 'smtp-settings',
            label: 'SMTP Settings',
            path: '/superadmin/smtp-settings',
            icon: Mail,
        },
        {
            id: 'knowledge-base-cms',
            label: 'Knowledge Base CMS',
            path: '/superadmin/knowledge-base-cms',
            icon: BookText,
        },
        {
            id: 'profile',
            label: 'Profile',
            path: '/superadmin/profile',
            icon: UserRound,
        },
    ];

    return (
        <div className="dashboard-theme flex h-screen bg-transparent">
            <div className="fixed left-4 top-4 z-50 lg:hidden">
                <Button
                    variant="outline"
                    size="icon"
                    className="border-[rgba(59,130,246,0.3)] bg-[rgba(239,246,255,0.92)] text-[var(--foreground)] shadow-[0_14px_35px_rgba(8,19,31,0.18)] hover:bg-[rgba(219,234,254,1)]"
                    onClick={() => setSidebarOpen((current) => !current)}
                >
                    {sidebarOpen ? <X className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
                </Button>
            </div>

            <aside
                className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-[rgba(59,130,246,0.18)] bg-[radial-gradient(circle_at_top,#15283d_0%,#0b1623_58%,#09131f_100%)] text-[var(--sidebar-foreground)] transition-transform lg:static lg:translate-x-0 ${
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="flex h-full flex-col">
                    <div className="border-b border-[rgba(59,130,246,0.16)] px-6 py-6">
                        <div className="flex items-center gap-3">
                            <div className="rounded-2xl bg-[linear-gradient(135deg,#93c5fd,#3b82f6)] p-3 text-[#08131f] shadow-[0_18px_40px_rgba(59,130,246,0.28)]">
                                <Building2 className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-lg font-semibold text-[var(--sidebar-foreground)]">{t('Gurukul')}</p>
                                <p className="text-xs uppercase tracking-[0.28em] text-[rgba(226,232,240,0.62)]">
                                    {t('Super Admin')}
                                </p>
                            </div>
                        </div>
                    </div>

                    <nav className="flex-1 space-y-2 px-4 py-6">
                        {navigationItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = superAdminView === item.id;

                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                        setSidebarOpen(false);
                                        router.visit(item.path);
                                    }}
                                    className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${
                                        isActive
                                            ? 'border border-[rgba(59,130,246,0.42)] bg-[linear-gradient(135deg,#93c5fd,#3b82f6)] text-[#08131f] shadow-[0_14px_28px_rgba(59,130,246,0.22)]'
                                            : 'text-[rgba(226,232,240,0.76)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
                                    }`}
                                >
                                    <Icon className="h-5 w-5" />
                                    <span className="font-medium">{t(item.label)}</span>
                                </button>
                            );
                        })}
                    </nav>

                    <div className="border-t border-[rgba(59,130,246,0.16)] px-6 py-5">
                        <div className="mb-4">
                            <p className="text-sm font-medium text-[var(--sidebar-foreground)]">{user.name}</p>
                            <p className="text-xs text-[rgba(226,232,240,0.62)]">{user.email}</p>
                        </div>
                        <Button
                            onClick={handleLogout}
                            variant="outline"
                            className="w-full border-[rgba(59,130,246,0.34)] bg-[#eff6ff] text-[#08131f] hover:bg-[#bfdbfe] hover:text-[#08131f]"
                        >
                            {t('Logout')}
                        </Button>
                    </div>
                </div>
            </aside>

            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-[rgba(6,15,24,0.7)] backdrop-blur-sm lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <div className="flex flex-1 flex-col overflow-hidden">
                <header className="border-b border-[rgba(37,99,235,0.18)] bg-[linear-gradient(180deg,rgba(11,22,35,0.96),rgba(16,31,46,0.9))] px-6 py-4 text-[var(--sidebar-foreground)] shadow-[0_18px_45px_rgba(8,19,31,0.18)]">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <h1 className="text-xl font-bold text-[var(--sidebar-foreground)]">
                                {t('Gurukul Superadmin')}
                            </h1>
                            <span className="rounded-full border border-[rgba(59,130,246,0.24)] bg-[rgba(59,130,246,0.12)] px-3 py-1 text-sm font-semibold text-[#93c5fd]">
                                {t('SUPER ADMIN')}
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-sm font-medium text-[var(--sidebar-foreground)]">{user.name}</p>
                                <p className="text-xs text-[rgba(226,232,240,0.62)]">{user.email}</p>
                            </div>
                            <Button
                                onClick={handleLogout}
                                variant="outline"
                                className="border-[rgba(59,130,246,0.34)] bg-[#eff6ff] text-[#08131f] hover:bg-[#bfdbfe] hover:text-[#08131f]"
                            >
                                {t('Logout')}
                            </Button>
                        </div>
                    </div>
                </header>

                <main className="min-h-0 flex-1 overflow-y-auto">
                    {superAdminView === 'smtp-settings' ? (
                        <SuperAdminSmtpSettings smtpSettings={smtpSettings} />
                    ) : superAdminView === 'knowledge-base-cms' ? (
                        <SuperAdminKnowledgeBaseCms knowledgeBaseContent={knowledgeBaseContent} />
                    ) : superAdminView === 'profile' ? (
                        <SuperAdminProfile user={user} inSuperAdminShell />
                    ) : superAdminView === 'profile-edit' ? (
                        <EditProfile user={user} inSuperAdminShell />
                    ) : superAdminView === 'organizations' ? (
                        <SuperAdminDashboard organizations={organizations} viewMode="organizations" />
                    ) : (
                        <SuperAdminDashboard organizations={organizations} viewMode="dashboard" />
                    )}
                </main>
            </div>
        </div>
    );
}
