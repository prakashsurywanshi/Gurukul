import React from 'react';
import type { LucideIcon } from 'lucide-react';

import { Badge } from './badge';
import { cn } from './utils';

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'neutral';

const toneClasses: Record<StatusTone, string> = {
    success: 'border-transparent bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
    warning: 'border-transparent bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
    danger: 'border-transparent bg-red-500/15 text-red-700 dark:bg-red-500/20 dark:text-red-300',
    info: 'border-transparent bg-sky-500/15 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
    muted: 'border-transparent bg-muted text-muted-foreground',
    neutral: 'text-foreground',
};

export function toneFromStatus(status: string): StatusTone {
    const normalized = status.toLowerCase();
    if (
        [
            'compliant',
            'verified',
            'paid',
            'complete',
            'completed',
            'approved',
            'active',
            'success',
            'present',
            'delivered',
            'granted',
        ].includes(normalized)
    ) {
        return 'success';
    }
    if (
        ['overdue', 'failed', 'refused', 'rejected', 'absent', 'overdue'].includes(normalized) ||
        normalized.includes('over')
    ) {
        return 'danger';
    }
    if (
        ['pending', 'partial', 'review', 'in_progress', 'scheduled', 'due', 'processing', 'hold'].includes(normalized)
    ) {
        return 'warning';
    }
    if (['info', 'new', 'archived', 'cancelled', 'canceled', 'inactive', 'disabled', 'closed'].includes(normalized)) {
        return 'muted';
    }
    return 'muted';
}

type StatusBadgeProps = {
    status: string;
    label?: React.ReactNode;
    tone?: StatusTone;
    icon?: LucideIcon;
    className?: string;
};

export function StatusBadge({ status, label, tone, icon: Icon, className }: StatusBadgeProps) {
    const resolvedTone = tone ?? toneFromStatus(status);

    return (
        <Badge variant="outline" className={cn('uppercase', toneClasses[resolvedTone], className)}>
            {Icon && <Icon className="size-3" />}
            {label ?? status.replace(/_/g, ' ')}
        </Badge>
    );
}
