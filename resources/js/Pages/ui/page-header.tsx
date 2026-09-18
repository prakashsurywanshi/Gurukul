import { useLanguage } from '../../i18n/LanguageProvider';
import React from 'react';

import { cn } from './utils';

export type BreadcrumbItem = {
    label: string;
    href?: string;
};

type PageHeaderProps = {
    title: React.ReactNode;
    description?: React.ReactNode;
    breadcrumb?: BreadcrumbItem[];
    actions?: React.ReactNode;
    className?: string;
};

export function PageHeader({ title, description, breadcrumb, actions, className }: PageHeaderProps) {
    const { t } = useLanguage();
    return (
        <div className={cn('flex flex-col gap-4', className)}>
            {breadcrumb && breadcrumb.length > 0 && (
                <nav aria-label={t('Breadcrumb')} className="text-sm">
                    <ol className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
                        {breadcrumb.map((item, index) => (
                            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
                                {index > 0 && (
                                    <span aria-hidden="true" className="text-muted-foreground/50">
                                        /
                                    </span>
                                )}
                                {item.href ? (
                                    <a href={item.href} className="truncate transition-colors hover:text-foreground">
                                        {item.label}
                                    </a>
                                ) : (
                                    <span className="truncate font-medium text-foreground">{item.label}</span>
                                )}
                            </li>
                        ))}
                    </ol>
                </nav>
            )}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h1>
                    {description && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>}
                </div>
                {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            </div>
        </div>
    );
}
