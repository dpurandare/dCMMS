import React from 'react';
import { Skeleton } from '../ui/skeleton';

interface CardSkeletonProps {
    count?: number;
    variant?: 'default' | 'compact' | 'detailed';
}

export function CardSkeleton({
    count = 1,
    variant = 'default',
}: CardSkeletonProps) {
    return (
        <>
            {Array.from({ length: count }).map((_, index) => (
                <div
                    key={index}
                    className="border rounded-lg p-6 space-y-4"
                >
                    {variant === 'detailed' && (
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3 flex-1">
                                <Skeleton className="h-12 w-12 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-5 w-3/4" />
                                    <Skeleton className="h-4 w-1/2" />
                                </div>
                            </div>
                            <Skeleton className="h-6 w-16 rounded-full" />
                        </div>
                    )}

                    {variant === 'default' && (
                        <>
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-6 w-1/3" />
                                <Skeleton className="h-6 w-20 rounded-full" />
                            </div>
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-5/6" />
                        </>
                    )}

                    {variant === 'compact' && (
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-5 w-2/3" />
                            <Skeleton className="h-8 w-24" />
                        </div>
                    )}

                    {variant !== 'compact' && (
                        <div className="flex gap-2 pt-2">
                            <Skeleton className="h-9 w-20" />
                            <Skeleton className="h-9 w-20" />
                        </div>
                    )}
                </div>
            ))}
        </>
    );
}

export function DashboardCardsSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="border rounded-lg p-6 space-y-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-3 w-full" />
                </div>
            ))}
        </div>
    );
}
