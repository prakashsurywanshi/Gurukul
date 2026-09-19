import React from 'react';

import { EmptyState } from './empty-state';
import { Skeleton } from './skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';
import { cn } from './utils';

export type Column<T> = {
    key: string;
    header: React.ReactNode;
    cell?: (row: T) => React.ReactNode;
    className?: string;
    headerClassName?: string;
    align?: 'left' | 'right' | 'center';
    hideBelow?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
};

const hideBelowClass: Record<NonNullable<Column<never>['hideBelow']>, string> = {
    sm: 'hidden sm:table-cell',
    md: 'hidden md:table-cell',
    lg: 'hidden lg:table-cell',
    xl: 'hidden xl:table-cell',
    '2xl': 'hidden 2xl:table-cell',
};

const alignClass = {
    left: 'text-left',
    right: 'text-right',
    center: 'text-center',
} as const;

type DataTableProps<T> = {
    columns: Column<T>[];
    rows: T[];
    rowKey: (row: T) => React.Key;
    loading?: boolean;
    loadingRows?: number;
    emptyTitle?: React.ReactNode;
    emptyDescription?: React.ReactNode;
    emptyAction?: React.ReactNode;
    onRowClick?: (row: T) => void;
    className?: string;
    'aria-label'?: string;
};

export function DataTable<T>({
    columns,
    rows,
    rowKey,
    loading,
    loadingRows = 5,
    emptyTitle,
    emptyDescription,
    emptyAction,
    onRowClick,
    className,
    ...ariaProps
}: DataTableProps<T> & { 'aria-label'?: string }) {
    const showEmpty = !loading && rows.length === 0;

    return (
        <div className={cn('w-full', className)}>
            <Table aria-label={ariaProps['aria-label']}>
                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                        {columns.map((column) => {
                            const hidden = column.hideBelow ? hideBelowClass[column.hideBelow] : undefined;
                            const align = column.align ? alignClass[column.align] : undefined;

                            return (
                                <TableHead
                                    key={column.key}
                                    className={cn(
                                        'text-xs font-semibold uppercase tracking-wide',
                                        hidden,
                                        align,
                                        column.headerClassName,
                                    )}
                                >
                                    {column.header}
                                </TableHead>
                            );
                        })}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading
                        ? Array.from({ length: loadingRows }, (_, rowIndex) => (
                              <TableRow key={`loading-${rowIndex}`} className="hover:bg-transparent">
                                  {columns.map((column) => (
                                      <TableCell
                                          key={column.key}
                                          className={cn(
                                              column.hideBelow ? hideBelowClass[column.hideBelow] : undefined,
                                              column.align ? alignClass[column.align] : undefined,
                                          )}
                                      >
                                          <Skeleton className="h-4 w-full max-w-[160px]" />
                                      </TableCell>
                                  ))}
                              </TableRow>
                          ))
                        : rows.map((row) => (
                              <TableRow
                                  key={rowKey(row)}
                                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                                  className={cn(onRowClick && 'cursor-pointer')}
                              >
                                  {columns.map((column) => (
                                      <TableCell
                                          key={column.key}
                                          className={cn(
                                              column.hideBelow ? hideBelowClass[column.hideBelow] : undefined,
                                              column.align ? alignClass[column.align] : undefined,
                                              column.className,
                                          )}
                                      >
                                          {column.cell ? column.cell(row) : null}
                                      </TableCell>
                                  ))}
                              </TableRow>
                          ))}
                </TableBody>
            </Table>
            {showEmpty && (
                <EmptyState
                    title={emptyTitle ?? 'No records found'}
                    description={emptyDescription}
                    action={emptyAction}
                />
            )}
        </div>
    );
}
