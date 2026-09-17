import React from 'react';
import type { LucideIcon } from 'lucide-react';

import { Card, CardContent } from './card';
import { cn } from './utils';

export type StatTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

const toneIconClasses: Record<StatTone, string> = {
    default: 'bg-muted text-foreground',
    success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    danger: 'bg-red-500/15 text-red-600 dark:text-red-400',
    info: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
};

const toneValueClasses: Record<StatTone, string> = {
    default: 'text-foreground',
    success: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-amber-600 dark:text-amber-400',
    danger: 'text-red-600 dark:text-red-400',
    info: 'text-sky-600 dark:text-sky-400',
};

type StatCardProps = {
    label: React.ReactNode;
    value: React.ReactNode;
    icon?: LucideIcon;
    hint?: React.ReactNode;
    tone?: StatTone;
    className?: string;
};

export function StatCard({ label, value, icon: Icon, hint, tone = 'default', className }: StatCardProps) {
    return (
        <Card className={cn('gap-2 p-0', className)}>
            <CardContent className="flex items-center gap-4 px-4 py-4">
                {Icon && (
                    <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', toneIconClasses[tone])}>
                        <Icon className="size-5" />
                    </div>
                )}
                <div className="min-w-0">
                    <p className="truncate text-sm text-muted-foreground">{label}</p>
                    <p className={cn('mt-0.5 text-xl font-semibold tabular-nums', toneValueClasses[tone])}>{value}</p>
                    {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
                </div>
            </CardContent>
        </Card>
    );
}