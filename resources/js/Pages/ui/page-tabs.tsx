import React from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from './utils';

export type PageTabItem = {
    value: string;
    label: React.ReactNode;
    icon?: LucideIcon;
    count?: number;
    disabled?: boolean;
};

type PageTabsProps = {
    tabs: PageTabItem[];
    value: string;
    onChange: (value: string) => void;
    rightSlot?: React.ReactNode;
    className?: string;
    scrollable?: boolean;
};

export function PageTabs({ tabs, value, onChange, rightSlot, className, scrollable }: PageTabsProps) {
    return (
        <div className={cn('flex flex-wrap items-center justify-between gap-3', className)}>
            <div
                className={cn(
                    'inline-flex items-center gap-1 rounded-lg bg-muted/70 p-1 text-muted-foreground',
                    scrollable && 'w-full overflow-x-auto sm:w-auto',
                )}
            >
                {tabs.map((tab) => {
                    const active = tab.value === value;
                    const Icon = tab.icon;

                    return (
                        <button
                            key={tab.value}
                            type="button"
                            disabled={tab.disabled}
                            onClick={() => onChange(tab.value)}
                            className={cn(
                                'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                                active
                                    ? 'bg-card text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:bg-card/60 hover:text-foreground',
                                tab.disabled && 'pointer-events-none opacity-50',
                            )}
                        >
                            {Icon && <Icon className="size-4" />}
                            {tab.label}
                            {typeof tab.count === 'number' && tab.count > 0 && (
                                <span
                                    className={cn(
                                        'ml-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1 text-xs tabular-nums',
                                        active ? 'bg-primary/15 text-primary' : 'bg-muted-foreground/15',
                                    )}
                                >
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
            {rightSlot && <div className="flex flex-wrap items-center gap-2">{rightSlot}</div>}
        </div>
    );
}