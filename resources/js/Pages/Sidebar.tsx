import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageProvider';
import { Button } from './ui/button';
import { ChevronDown, ChevronRight, GraduationCap } from 'lucide-react';
import { router, usePage } from '@inertiajs/react';
import { sidebarConfig, type SidebarMenuItem } from './sidebarMenu';

interface SidebarChildItem {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    href?: string;
}

type DynamicSidebarNavMode = 'href' | 'id' | 'href-or-id';

interface SidebarSectionProps {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    isGroupActive: boolean;
    isOpen: boolean;
    onToggle: () => void;
    items: SidebarChildItem[];
    activeTab: string;
    navMode?: DynamicSidebarNavMode;
    activeItemRef: React.RefObject<HTMLButtonElement | null>;
    onChildClick: (href: string) => void;
}

function SidebarSection({
    icon: SectionIcon,
    label,
    isGroupActive,
    isOpen,
    onToggle,
    items,
    activeTab,
    navMode = 'href',
    activeItemRef,
    onChildClick,
}: SidebarSectionProps) {
    const { t } = useLanguage();

    const resolveHref = (item: SidebarChildItem) => {
        if (navMode === 'id') {
            return `/${item.id}`;
        }
        return item.href ?? `/${item.id}`;
    };

    return (
        <div className="pt-1">
            <Button
                type="button"
                variant="ghost"
                className={`w-full justify-start text-[rgba(226,232,240,0.76)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white ${
                    isGroupActive
                        ? 'border border-[rgba(59,130,246,0.42)] bg-[linear-gradient(135deg,#93c5fd,#3b82f6)] text-[#08131f] shadow-[0_14px_28px_rgba(59,130,246,0.22)] hover:bg-[linear-gradient(135deg,#93c5fd,#2563eb)]'
                        : ''
                }`}
                onClick={onToggle}
            >
                <SectionIcon className="w-4 h-4 mr-3" />
                {t(label)}
                <span className="ml-auto">
                    {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </span>
            </Button>

            {isOpen && (
                <div
                    className={`relative mt-1 ml-6 space-y-1 border-l border-white/10 pl-3 ${
                        isGroupActive ? 'border-[rgba(59,130,246,0.42)]' : ''
                    }`}
                >
                    {items.map((item) => {
                        const isActive = activeTab === item.id;
                        return (
                            <Button
                                key={item.id}
                                ref={isActive ? activeItemRef : undefined}
                                variant="ghost"
                                className={`w-full justify-start ${
                                    isActive
                                        ? 'border border-[rgba(59,130,246,0.42)] bg-[linear-gradient(135deg,#93c5fd,#3b82f6)] text-[#08131f] shadow-[0_14px_28px_rgba(59,130,246,0.22)] hover:bg-[linear-gradient(135deg,#93c5fd,#2563eb)]'
                                        : 'text-[rgba(226,232,240,0.76)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
                                }`}
                                onClick={() => onChildClick(resolveHref(item))}
                            >
                                {t(item.label)}
                            </Button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

interface SidebarProps {
    user: any;
    activeTab: string;
    onTabChange?: (tab: string) => void;
    onLogout?: () => void;
    onNavigate?: () => void;
}

interface SidebarGroupEntry {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    navMode: DynamicSidebarNavMode;
    tabs: string[];
    items: SidebarMenuItem[];
}

export default function Sidebar({ user, activeTab, onNavigate }: SidebarProps) {
    const { schoolName, schoolLogo, staffPermissions, modules } = usePage<{
        schoolName?: string | null;
        schoolLogo?: string | null;
        staffPermissions?: Record<string, Record<string, boolean>>;
        modules?: Record<string, boolean>;
    }>().props;
    const { t } = useLanguage();
    const sidebarScrollRef = useRef<HTMLDivElement | null>(null);
    const activeItemRef = useRef<HTMLButtonElement | null>(null);
    const shouldScrollToActiveRef = useRef(true);
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => ({}));

    const hasPermission = (feature: string) => {
        if (['super_admin', 'branch_admin'].includes(user.role)) {
            return true;
        }

        if (!['admin', 'teacher', 'receptionist', 'accountant', 'librarian'].includes(user.role)) {
            return true;
        }

        return Boolean(staffPermissions?.[feature]?.view);
    };

    const canAccessItem = (roles: string[], feature: string, module?: string) => {
        if (user.role === 'super_admin') {
            return roles.includes('super_admin');
        }

        if (module && modules?.[module] === false) {
            return false;
        }

        if (['admin', 'teacher', 'receptionist', 'accountant', 'librarian', 'branch_admin'].includes(user.role)) {
            const isPortalOnlyItem = roles.every((role) => ['student', 'parent'].includes(role));

            if (isPortalOnlyItem) {
                return false;
            }

            return hasPermission(feature);
        }

        return roles.includes(user.role);
    };

    const visibleGroups: SidebarGroupEntry[] = sidebarConfig
        .map((group) => ({
            id: group.id,
            label: group.label,
            icon: group.icon,
            navMode: group.navMode,
            tabs: group.tabs,
            items: group.items.filter((item) => canAccessItem(item.roles ?? [], item.feature ?? '', item.module)),
        }))
        .filter((group) => group.items.length > 0);

    useEffect(() => {
        shouldScrollToActiveRef.current = true;

        setOpenGroups((current) => {
            const next = { ...current };
            for (const group of visibleGroups) {
                if (group.tabs.includes(activeTab)) {
                    next[group.id] = true;
                }
            }
            return next;
        });
    }, [activeTab]);

    useEffect(() => {
        if (!shouldScrollToActiveRef.current || !sidebarScrollRef.current || !activeItemRef.current) {
            return;
        }

        const scrollContainer = sidebarScrollRef.current;
        const activeElement = activeItemRef.current;
        const containerRect = scrollContainer.getBoundingClientRect();
        const activeRect = activeElement.getBoundingClientRect();

        if (activeRect.top < containerRect.top || activeRect.bottom > containerRect.bottom) {
            activeElement.scrollIntoView({
                block: 'nearest',
                behavior: 'smooth',
            });
        }

        shouldScrollToActiveRef.current = false;
    }, [activeTab, openGroups]);

    return (
        <div className="h-full w-64 flex-col border-r border-[rgba(59,130,246,0.18)] bg-[radial-gradient(circle_at_top,#15283d_0%,#0b1623_58%,#09131f_100%)] text-[var(--sidebar-foreground)] shadow-[18px_0_40px_rgba(8,19,31,0.22)] flex">
            <div className="border-b border-[rgba(59,130,246,0.16)] p-6">
                <div className="flex items-center gap-3">
                    <div
                        className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl shadow-[0_16px_30px_rgba(59,130,246,0.28)] ${schoolLogo ? 'bg-white' : 'bg-[linear-gradient(135deg,#93c5fd,#3b82f6)]'}`}
                    >
                        {schoolLogo ? (
                            <img
                                src={schoolLogo}
                                alt={`${schoolName || 'School'} logo`}
                                className="max-h-full max-w-full object-contain p-1"
                            />
                        ) : (
                            <GraduationCap className="h-6 w-6 text-[#08131f]" />
                        )}
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-[0.02em] text-[var(--sidebar-foreground)]">
                            {schoolName || 'Gurukul'}
                        </h1>
                        <p className="text-xs uppercase tracking-[0.28em] text-[rgba(226,232,240,0.62)]">
                            {t('ERP System')}
                        </p>
                    </div>
                </div>
            </div>

            <div ref={sidebarScrollRef} className="flex-1 overflow-y-scroll">
                <div className="p-4 space-y-1">
                    {visibleGroups.map((group) => {
                        const isGroupActive = group.tabs.includes(activeTab);
                        const isOpen = Boolean(openGroups[group.id]) || isGroupActive;
                        const Icon = group.icon;

                        if (group.items.length === 1) {
                            const only = group.items[0];
                            const onlyIcon = only.icon;
                            const OnlyIcon = onlyIcon as React.ComponentType<{ className?: string }>;
                            const isActive = activeTab === only.id;

                            return (
                                <Button
                                    key={only.id}
                                    ref={isActive ? activeItemRef : undefined}
                                    variant={isActive ? 'default' : 'ghost'}
                                    className={`w-full justify-start ${
                                        isActive
                                            ? 'border border-[rgba(59,130,246,0.42)] bg-[linear-gradient(135deg,#93c5fd,#3b82f6)] text-[#08131f] shadow-[0_14px_28px_rgba(59,130,246,0.22)] hover:bg-[linear-gradient(135deg,#93c5fd,#2563eb)]'
                                            : 'text-[rgba(226,232,240,0.76)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
                                    }`}
                                    onClick={() => {
                                        router.visit(only.href ?? `/${only.id}`);
                                        onNavigate?.();
                                    }}
                                >
                                    <OnlyIcon className="w-4 h-4 mr-3" />
                                    {t(only.label)}
                                </Button>
                            );
                        }

                        return (
                            <SidebarSection
                                key={group.id}
                                icon={Icon}
                                label={group.label}
                                isGroupActive={isGroupActive}
                                isOpen={isOpen}
                                onToggle={() =>
                                    setOpenGroups((current) => ({
                                        ...current,
                                        [group.id]: !current[group.id],
                                    }))
                                }
                                items={group.items}
                                activeTab={activeTab}
                                navMode={group.navMode}
                                activeItemRef={activeItemRef}
                                onChildClick={(href) => {
                                    router.visit(href);
                                    onNavigate?.();
                                }}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
