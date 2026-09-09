import React, { useEffect, useState } from 'react';
import { User, LogOut, Menu, X, ChevronDown, Pencil, ListTodo, CalendarCheck, Globe } from 'lucide-react';
import { router, usePage } from '@inertiajs/react';
import Sidebar from './Sidebar';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { ThemeToggle } from '../components/ThemeToggle';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useLanguage } from '../i18n/LanguageProvider';

export default function DashboardLayout({ user, activeTab, onLogout, children }: any) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { activeSession, subscriptionNotice, impersonation, staffPermissions } = usePage<{
        activeSession?: string | null;
        staffPermissions?: Record<string, Record<string, boolean>>;
        subscriptionNotice?: {
            message: string;
            daysUntilExpiry: number;
            expiryDate: string;
        } | null;
        impersonation?: {
            isImpersonating: boolean;
            impersonator: {
                id: number;
                name: string;
                email: string;
                role: string;
            };
        } | null;
    }>().props;
    const isManagedStaffRole = ['admin', 'teacher', 'receptionist', 'accountant', 'librarian'].includes(user?.role);
    const canViewTodo = user?.role === 'super_admin' || (isManagedStaffRole && Boolean(staffPermissions?.Todo?.view));
    const { t } = useLanguage();

    const formatRole = (role: string) =>
        role
            .split('_')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

    const handleLogout = () => {
        if (confirm('Are you sure you want to logout?')) {
            router.post('/logout');
        }
    };

    const handleLeaveImpersonation = () => {
        router.post('/superadmin/impersonation/leave');
    };

    useEffect(() => {
        const { body, documentElement } = document;
        const previousBodyOverflow = body.style.overflow;
        const previousHtmlOverflow = documentElement.style.overflow;

        body.style.overflow = 'hidden';
        documentElement.style.overflow = 'hidden';

        return () => {
            body.style.overflow = previousBodyOverflow;
            documentElement.style.overflow = previousHtmlOverflow;
        };
    }, []);

    return (
        <div className="dashboard-theme flex h-screen bg-[var(--background)]">
            <div className="lg:hidden fixed top-4 left-4 z-50">
                <Button
                    variant="outline"
                    size="icon"
                    className="border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] shadow-sm hover:bg-[var(--accent)]"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                    {sidebarOpen ? <X /> : <Menu />}
                </Button>
            </div>

            <div
                className={`${
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 transition-transform`}
            >
                <Sidebar
                    user={user}
                    activeTab={activeTab}
                    onLogout={onLogout}
                    onNavigate={() => setSidebarOpen(false)}
                />
            </div>

            {sidebarOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-30 bg-[rgba(6,15,24,0.7)] backdrop-blur-sm"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="z-20 flex items-center justify-between border-b border-[var(--border)] bg-[var(--card)] px-6 py-4 text-[var(--foreground)] shadow-sm backdrop-blur-xl transition-colors duration-300">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 text-sm shadow-sm">
                            <CalendarCheck className="h-4 w-4 text-[var(--primary)]" />
                            <span className="text-[var(--muted-foreground)]">{t('nav.session')}:</span>
                            <span className="font-semibold text-[var(--foreground)]">{activeSession || 'Not Set'}</span>
                        </div>

                        {canViewTodo && (
                            <Button
                                variant={activeTab === 'todo' ? 'default' : 'outline'}
                                className={`gap-2 border-[var(--border)] ${
                                    activeTab === 'todo'
                                        ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm hover:bg-[var(--primary)]'
                                        : 'bg-[var(--secondary)] text-[var(--foreground)] shadow-sm hover:bg-[var(--accent)]'
                                }`}
                                onClick={() => router.visit('/todo')}
                            >
                                <ListTodo className="h-4 w-4" />
                                {t('TO DO')}
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <LanguageSwitcher />

                        <button
                            onClick={() => window.open('/', '_blank')}
                            className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--secondary)] p-2 shadow-sm transition hover:bg-[var(--accent)]"
                            title={t('nav.visitWebsite')}
                        >
                            <Globe className="h-4 w-4 text-[var(--primary)]" />
                        </button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 text-left shadow-sm transition hover:bg-[var(--accent)]">
                                    <Avatar className="h-9 w-9">
                                        <AvatarFallback className="bg-[linear-gradient(135deg,#bfdbfe,#60a5fa)] font-semibold text-[#08131f]">
                                            {user.name?.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="hidden sm:block">
                                        <p className="text-sm font-medium text-[var(--foreground)]">{user.name}</p>
                                        <p className="text-xs text-[var(--muted-foreground)]">
                                            {formatRole(user.role)}
                                        </p>
                                    </div>
                                    <ChevronDown className="h-4 w-4 text-[var(--muted-foreground)]" />
                                </button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end" className="w-56 rounded-xl">
                                <DropdownMenuLabel>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-[var(--foreground)]">{user.name}</p>
                                        <p className="text-xs font-normal text-[var(--muted-foreground)]">
                                            {user.email}
                                        </p>
                                    </div>
                                </DropdownMenuLabel>

                                <DropdownMenuSeparator />

                                <DropdownMenuItem onClick={() => router.visit('/profile')}>
                                    <User className="h-4 w-4" />
                                    {t('Profile')}
                                </DropdownMenuItem>

                                <DropdownMenuItem onClick={() => router.visit('/profile/edit')}>
                                    <Pencil className="h-4 w-4" />
                                    {t('Edit Profile')}
                                </DropdownMenuItem>

                                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-700">
                                    <LogOut className="h-4 w-4" />
                                    {t('Logout')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto">
                    {impersonation?.isImpersonating && (
                        <div className="border-b border-[var(--border)] bg-[var(--accent)] px-6 py-3 text-sm text-[var(--foreground)]">
                            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
                                <p>
                                    {t('You are viewing this school as')}
                                    {user.name}
                                    {'. '}
                                    {t('Return to')} {impersonation.impersonator.name}
                                    {t("'s superadmin account when you're done.")}
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-[var(--border)] bg-[var(--card)] hover:bg-[var(--accent)]"
                                    onClick={handleLeaveImpersonation}
                                >
                                    {t('Stop Impersonating')}
                                </Button>
                            </div>
                        </div>
                    )}

                    {subscriptionNotice && (
                        <div className="border-b border-[var(--border)] bg-[var(--accent)] px-6 py-3 text-sm text-[var(--foreground)]">
                            <div className="mx-auto max-w-7xl">
                                <p>{subscriptionNotice.message}</p>
                            </div>
                        </div>
                    )}

                    <div>{children}</div>
                </div>
            </div>
        </div>
    );
}
