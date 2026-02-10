import React from 'react';
import { Skeleton } from '../ui/skeleton';

interface TableSkeletonProps {
    rows?: number;
    columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 5 }: TableSkeletonProps) {
    return (
        <div className="w-full">
            {/* Table Header */}
            <div className="flex gap-4 mb-4 pb-3 border-b">
                {Array.from({ length: columns }).map((_, i) => (
                    <Skeleton key={`header-${i}`} className="h-6 flex-1" />
                ))}
            </div>

            {/* Table Rows */}
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <div key={`row-${rowIndex}`} className="flex gap-4 mb-3">
                    {Array.from({ length: columns }).map((_, colIndex) => (
                        <Skeleton
                            key={`cell-${rowIndex}-${colIndex}`}
                            className="h-12 flex-1"
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}

export function TableSkeletonWithActions({ rows = 5 }: { rows?: number }) {
    return (
        <div className="w-full space-y-4">
            {/* Filters/Actions Bar */}
            <div className="flex justify-between items-center mb-4">
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-48" /> {/* Search */}
                    <Skeleton className="h-10 w-32" /> {/* Filter 1 */}
                    <Skeleton className="h-10 w-32" /> {/* Filter 2 */}
                </div>
                <Skeleton className="h-10 w-32" /> {/* Action button */}
            </div>

            {/* Table */}
            <TableSkeleton rows={rows} columns={6} />

            {/* Pagination */}
            <div className="flex justify-between items-center mt-4">
                <Skeleton className="h-10 w-48" /> {/* Page info */}
                <Skeleton className="h-10 w-64" /> {/* Page controls */}
            </div>
        </div>
    );
}
