import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface PageHeaderProps {
    title: string;
    description?: string;
    breadcrumbs?: BreadcrumbItem[];
    actions?: ReactNode;
    className?: string;
}

export function PageHeader({
    title,
    description,
    breadcrumbs,
    actions,
    className,
}: PageHeaderProps) {
    return (
        <div className={cn('flex flex-col gap-4 pb-4 md:flex-row md:items-center md:justify-between', className)}>
            <div className="space-y-1.5">
                {breadcrumbs && (
                    <nav className="mb-2 flex items-center text-sm text-muted-foreground">
                        {breadcrumbs.map((item, index) => (
                            <span key={index} className="flex items-center">
                                {index > 0 && <span className="mx-2">/</span>}
                                {item.href ? (
                                    <a href={item.href} className="hover:text-foreground">
                                        {item.label}
                                    </a>
                                ) : (
                                    <span className="text-foreground">{item.label}</span>
                                )}
                            </span>
                        ))}
                    </nav>
                )}
                <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                {description && <p className="text-muted-foreground">{description}</p>}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
    );
}
