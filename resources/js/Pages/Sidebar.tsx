import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageProvider';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ChevronDown, ChevronRight, GraduationCap, Search, X } from 'lucide-react';
import { router, usePage } from '@inertiajs/react';
import { sidebarConfig, type OrgType, type SidebarMenuItem } from './sidebarMenu';

interface SidebarChildItem {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    href?: string;
}

type DynamicSidebarNavMode = 'href' | 'id' | 'href-or-id';

interface NormalizedSidebarUrl {
    path: string;
    params: URLSearchParams;
}

interface SidebarNavCandidate {
    groupId: string;
    item: SidebarMenuItem;
    navMode: DynamicSidebarNavMode;
}

interface ResolvedSidebarNav {
    groupId: string;
    itemId: string;
}

const normalizeSidebarPath = (path: string) => {
    const normalized = `/${path}`.replace(/\/+/g, '/');
    return normalized.length > 1 ? normalized.replace(/\/+$/, '') : normalized;
};

const normalizeSidebarUrl = (value: string): NormalizedSidebarUrl => {
    try {
        const url = new URL(value, 'http://localhost');
        url.searchParams.sort();
        return { path: normalizeSidebarPath(url.pathname), params: url.searchParams };
    } catch {
        const [withoutHash] = value.split('#');
        const [path, search = ''] = withoutHash.split('?');
        const params = new URLSearchParams(search);
        params.sort();
        return { path: normalizeSidebarPath(path), params };
    }
};

const resolveSidebarHref = (item: SidebarMenuItem, navMode: DynamicSidebarNavMode) => {
    if (navMode === 'id') {
        return `/${item.id}`;
    }

    return item.href ?? `/${item.id}`;
};

const sidebarQueryMatches = (target: URLSearchParams, current: URLSearchParams) => {
    const keys = Array.from(new Set(target.keys()));

    return keys.every((key) => {
        const targetValues = target.getAll(key);
        const currentValues = current.getAll(key);
        return targetValues.every((value) => currentValues.includes(value));
    });
};

const normalizeSidebarComponent = (component: string) =>
    component
        .replace(/\\/g, '/')
        .replace(/^Pages\//, '')
        .replace(/\.tsx$/, '')
        .toLowerCase();

const sidebarItemMatchesComponent = (item: SidebarMenuItem, component: string) =>
    item.activeMatch?.some((alias) => {
        if (alias.startsWith('/')) {
            return false;
        }

        const normalizedAlias = normalizeSidebarComponent(alias);
        return component === normalizedAlias || component.endsWith(`/${normalizedAlias}`);
    }) ?? false;

const normalizeSidebarSearchValue = (value: string) => value.normalize('NFKD').toLocaleLowerCase().trim();

const sidebarSearchMatches = (tokens: string[], values: string[]) => {
    const normalizedValues = values.map(normalizeSidebarSearchValue);
    return tokens.every((token) => normalizedValues.some((value) => value.includes(token)));
};

interface SidebarSectionProps {
    groupId: string;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    isGroupActive: boolean;
    isOpen: boolean;
    onToggle: () => void;
    items: SidebarChildItem[];
    activeItemId: string | null;
    navMode?: DynamicSidebarNavMode;
    activeItemRef: React.RefObject<HTMLButtonElement | null>;
    onChildClick: (href: string) => void;
}

function SidebarSection({
    groupId,
    icon: SectionIcon,
    label,
    isGroupActive,
    isOpen,
    onToggle,
    items,
    activeItemId,
    navMode = 'href',
    activeItemRef,
    onChildClick,
}: SidebarSectionProps) {
    const { t } = useLanguage();

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
                aria-expanded={isOpen}
                aria-controls={`sidebar-group-${groupId}`}
            >
                <SectionIcon className="w-4 h-4 mr-3" />
                {t(label)}
                <span className="ml-auto">
                    {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </span>
            </Button>

            {isOpen && (
                <div
                    id={`sidebar-group-${groupId}`}
                    className={`relative mt-1 ml-6 space-y-1 border-l border-white/10 pl-3 ${
                        isGroupActive ? 'border-[rgba(59,130,246,0.42)]' : ''
                    }`}
                >
                    {items.map((item) => {
                        const isActive = activeItemId === item.id;
                        return (
                            <Button
                                key={item.id}
                                ref={isActive ? activeItemRef : undefined}
                                aria-current={isActive ? 'page' : undefined}
                                variant="ghost"
                                className={`w-full justify-start ${
                                    isActive
                                        ? 'border border-[rgba(59,130,246,0.42)] bg-[linear-gradient(135deg,#93c5fd,#3b82f6)] text-[#08131f] shadow-[0_14px_28px_rgba(59,130,246,0.22)] hover:bg-[linear-gradient(135deg,#93c5fd,#2563eb)]'
                                        : 'text-[rgba(226,232,240,0.76)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
                                }`}
                                onClick={() => onChildClick(resolveSidebarHref(item, navMode))}
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
    items: SidebarMenuItem[];
}

export default function Sidebar({ user, activeTab, onNavigate }: SidebarProps) {
    const page = usePage<{
        schoolName?: string | null;
        schoolLogo?: string | null;
        staffPermissions?: Record<string, Record<string, boolean>>;
        modules?: Record<string, boolean>;
        orgType?: string;
    }>();
    const { schoolName, schoolLogo, staffPermissions, modules, orgType } = page.props;
    const { t } = useLanguage();
    const sidebarScrollRef = useRef<HTMLDivElement | null>(null);
    const activeItemRef = useRef<HTMLButtonElement | null>(null);
    const shouldScrollToActiveRef = useRef(true);
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => ({}));
    const [sidebarSearch, setSidebarSearch] = useState('');
    const sidebarSearchRef = useRef<HTMLInputElement>(null);

    const hasPermission = (feature: string) => {
        if (['super_admin', 'branch_admin'].includes(user.role)) {
            return true;
        }

        if (!['admin', 'teacher', 'receptionist', 'accountant', 'librarian'].includes(user.role)) {
            return true;
        }

        return Boolean(staffPermissions?.[feature]?.view);
    };

    const canAccessItem = (roles: string[], feature: string, module?: string, orgTypes?: OrgType[]) => {
        if (orgTypes && orgTypes.length > 0 && !orgTypes.includes(orgType as OrgType)) {
            return false;
        }

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
            items: group.items.filter((item) =>
                canAccessItem(item.roles ?? [], item.feature ?? '', item.module, item.orgTypes),
            ),
        }))
        .filter((group) => group.items.length > 0);

    const searchTokens = normalizeSidebarSearchValue(sidebarSearch).split(/\s+/).filter(Boolean);
    const isSearching = searchTokens.length > 0;
    const filteredGroups = visibleGroups.flatMap((group) => {
        const groupSearchValues = [t(group.label), group.id];

        if (sidebarSearchMatches(searchTokens, groupSearchValues)) {
            return [{ ...group, items: group.items }];
        }

        const items = group.items.filter((item) =>
            sidebarSearchMatches(searchTokens, [...groupSearchValues, t(item.label), item.id, t(item.feature ?? '')]),
        );

        return items.length > 0 ? [{ ...group, items }] : [];
    });
    const filteredItemCount = filteredGroups.reduce((count, group) => count + group.items.length, 0);

    const navCandidates: SidebarNavCandidate[] = visibleGroups.flatMap((group) =>
        group.items.map((item) => ({ groupId: group.id, item, navMode: group.navMode })),
    );
    const currentUrl = normalizeSidebarUrl(page.url);
    const currentComponent = normalizeSidebarComponent(page.component);

    const resolveActiveNavigation = (): ResolvedSidebarNav | null => {
        const selectCandidate = (candidates: SidebarNavCandidate[]) => {
            if (candidates.length === 0) {
                return null;
            }

            const activeTabMatches = activeTab ? candidates.filter((candidate) => candidate.item.id === activeTab) : [];
            const preferred = activeTabMatches.length === 1 ? activeTabMatches : candidates;
            const componentMatches = preferred.filter((candidate) =>
                sidebarItemMatchesComponent(candidate.item, currentComponent),
            );

            if (componentMatches.length === 1) {
                return componentMatches[0];
            }

            return preferred.length === 1 ? preferred[0] : null;
        };

        const toResolvedNavigation = (candidate: SidebarNavCandidate): ResolvedSidebarNav => ({
            groupId: candidate.groupId,
            itemId: candidate.item.id,
        });

        const routeMatches = navCandidates.flatMap((candidate) => {
            const routeAliases = candidate.item.activeMatch?.filter((alias) => alias.startsWith('/')) ?? [];
            const targets = [resolveSidebarHref(candidate.item, candidate.navMode), ...routeAliases];
            const scores = targets.map((target, index) => {
                const normalizedTarget = normalizeSidebarUrl(target);
                if (
                    normalizedTarget.path !== currentUrl.path ||
                    !sidebarQueryMatches(normalizedTarget.params, currentUrl.params)
                ) {
                    return 0;
                }

                const queryKeyCount = new Set(normalizedTarget.params.keys()).size;
                return 800 + queryKeyCount * 100 + (index > 0 ? 50 : 0);
            });
            const score = Math.max(...scores);

            return score > 0 ? [{ candidate, score }] : [];
        });
        const bestRouteScore = routeMatches.reduce((best, match) => Math.max(best, match.score), 0);

        if (bestRouteScore > 0) {
            const selected = selectCandidate(
                routeMatches.filter((match) => match.score === bestRouteScore).map((match) => match.candidate),
            );
            if (selected) {
                return toResolvedNavigation(selected);
            }
        }

        const componentMatches = navCandidates.filter((candidate) =>
            sidebarItemMatchesComponent(candidate.item, currentComponent),
        );
        const componentSelection = selectCandidate(componentMatches);
        if (componentSelection) {
            return toResolvedNavigation(componentSelection);
        }

        const activeTabMatches = navCandidates.filter((candidate) => candidate.item.id === activeTab);
        const activeTabSelection = selectCandidate(activeTabMatches);
        if (activeTabSelection) {
            return toResolvedNavigation(activeTabSelection);
        }

        const prefixMatches = navCandidates.flatMap((candidate) => {
            const routeAliases = candidate.item.activeMatch?.filter((alias) => alias.startsWith('/')) ?? [];
            const targets = [resolveSidebarHref(candidate.item, candidate.navMode), ...routeAliases];
            const scores = targets.map((target) => {
                const normalizedTarget = normalizeSidebarUrl(target);
                if (
                    normalizedTarget.path === '/' ||
                    !currentUrl.path.startsWith(`${normalizedTarget.path}/`) ||
                    !sidebarQueryMatches(normalizedTarget.params, currentUrl.params)
                ) {
                    return 0;
                }

                const segmentCount = normalizedTarget.path.split('/').filter(Boolean).length;
                return 400 + segmentCount * 10 + new Set(normalizedTarget.params.keys()).size;
            });
            const score = Math.max(...scores);

            return score > 0 ? [{ candidate, score }] : [];
        });
        const bestPrefixScore = prefixMatches.reduce((best, match) => Math.max(best, match.score), 0);

        if (bestPrefixScore > 0) {
            const selected = selectCandidate(
                prefixMatches.filter((match) => match.score === bestPrefixScore).map((match) => match.candidate),
            );
            if (selected) {
                return toResolvedNavigation(selected);
            }
        }

        return null;
    };

    const activeNavigation = resolveActiveNavigation();
    const activeNavigationKey = activeNavigation ? `${activeNavigation.groupId}:${activeNavigation.itemId}` : null;

    useEffect(() => {
        shouldScrollToActiveRef.current = true;

        setOpenGroups((current) => {
            if (!activeNavigation || current[activeNavigation.groupId]) {
                return current;
            }

            return { ...current, [activeNavigation.groupId]: true };
        });
    }, [activeNavigationKey]);

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
    }, [activeNavigationKey, openGroups]);

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
                            {schoolName || t('Gurukul')}
                        </h1>
                        <p className="text-xs uppercase tracking-[0.28em] text-[rgba(226,232,240,0.62)]">
                            {t('ERP System')}
                        </p>
                    </div>
                </div>
            </div>

            <div className="border-b border-[rgba(59,130,246,0.12)] px-4 py-3">
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[rgba(226,232,240,0.48)]" />
                    <Input
                        ref={sidebarSearchRef}
                        type="search"
                        value={sidebarSearch}
                        onChange={(event) => setSidebarSearch(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Escape') {
                                event.preventDefault();
                                setSidebarSearch('');
                            }
                        }}
                        placeholder={t('Search')}
                        aria-label={t('Search')}
                        aria-controls="sidebar-navigation-results"
                        autoComplete="off"
                        spellCheck={false}
                        className="sidebar-search-input h-9 pl-10 pr-10 text-[var(--sidebar-foreground)] [&::-webkit-search-cancel-button]:hidden"
                    />
                    {sidebarSearch && (
                        <button
                            type="button"
                            onClick={() => {
                                setSidebarSearch('');
                                sidebarSearchRef.current?.focus();
                            }}
                            className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-[rgba(226,232,240,0.6)] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]"
                            aria-label={t('Clear search')}
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
                <span className="sr-only" aria-live="polite">
                    {isSearching ? `${filteredItemCount} ${t('Results')}` : ''}
                </span>
            </div>

            <nav
                id="sidebar-navigation-results"
                ref={sidebarScrollRef}
                aria-label={t('Menu')}
                className="flex-1 overflow-y-scroll"
            >
                <div className="p-4 space-y-1">
                    {isSearching && filteredGroups.length === 0 ? (
                        <div className="flex flex-col items-center px-4 py-10 text-center" role="status">
                            <Search className="mb-3 h-7 w-7 text-[rgba(226,232,240,0.35)]" />
                            <p className="text-sm font-medium text-[rgba(226,232,240,0.8)]">{t('No results found.')}</p>
                            <p className="mt-1 text-xs text-[rgba(226,232,240,0.5)]">
                                {t('Try a different search term.')}
                            </p>
                        </div>
                    ) : (
                        filteredGroups.map((group) => {
                            const isGroupActive = activeNavigation?.groupId === group.id;
                            const isOpen = isSearching || Boolean(openGroups[group.id]) || isGroupActive;
                            const Icon = group.icon;

                            if (group.items.length === 1 && !isSearching) {
                                const only = group.items[0];
                                const onlyIcon = only.icon;
                                const OnlyIcon = onlyIcon as React.ComponentType<{ className?: string }>;
                                const isActive = isGroupActive && activeNavigation?.itemId === only.id;

                                return (
                                    <Button
                                        key={only.id}
                                        ref={isActive ? activeItemRef : undefined}
                                        aria-current={isActive ? 'page' : undefined}
                                        variant={isActive ? 'default' : 'ghost'}
                                        className={`w-full justify-start ${
                                            isActive
                                                ? 'border border-[rgba(59,130,246,0.42)] bg-[linear-gradient(135deg,#93c5fd,#3b82f6)] text-[#08131f] shadow-[0_14px_28px_rgba(59,130,246,0.22)] hover:bg-[linear-gradient(135deg,#93c5fd,#2563eb)]'
                                                : 'text-[rgba(226,232,240,0.76)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
                                        }`}
                                        onClick={() => {
                                            router.visit(resolveSidebarHref(only, group.navMode));
                                            setSidebarSearch('');
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
                                    groupId={group.id}
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
                                    activeItemId={isGroupActive ? (activeNavigation?.itemId ?? null) : null}
                                    navMode={group.navMode}
                                    activeItemRef={activeItemRef}
                                    onChildClick={(href) => {
                                        router.visit(href);
                                        setSidebarSearch('');
                                        onNavigate?.();
                                    }}
                                />
                            );
                        })
                    )}
                </div>
            </nav>
        </div>
    );
}
