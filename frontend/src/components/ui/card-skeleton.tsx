import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface CardSkeletonProps {
    count?: number;
}

export function CardSkeleton({ count = 1 }: CardSkeletonProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: count }).map((_, i) => (
                <Card key={i}>
                    <CardHeader className="gap-2">
                        <Skeleton className="h-5 w-1/2" />
                        <Skeleton className="h-4 w-4/5" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-24 w-full" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
