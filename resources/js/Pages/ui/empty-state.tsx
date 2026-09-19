import React from 'react';
import { Inbox, type LucideIcon } from 'lucide-react';

import { Button } from './button';
import { cn } from './utils';

type EmptyStateProps = {
    title: React.ReactNode;
    description?: React.ReactNode;
    icon?: LucideIcon;
    action?: React.ReactNode;
    actionLabel?: string;
    onAction?: () => void;
    className?: string;
};

export function EmptyState({
    title,
    description,
    icon: Icon = Inbox,
    action,
    actionLabel,
    onAction,
    className,
}: EmptyStateProps) {
    return (
        <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-12 text-center', className)}>
            <div className="flex size-12 items-center justify-center rounded-full bg-muted/70 text-muted-foreground">
                <Icon className="size-6" />
            </div>
            <div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                {description && <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
            </div>
            {(action || actionLabel) && (
                <div className="mt-1">
                    {action ??
                        (actionLabel && onAction && (
                            <Button size="sm" variant="outline" onClick={onAction}>
                                {actionLabel}
                            </Button>
                        ))}
                </div>
            )}
        </div>
    );
}
