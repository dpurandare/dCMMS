import { Badge } from '@/components/ui/badge';

interface AssetStatusBadgeProps {
    status: 'operational' | 'maintenance' | 'down' | 'retired';
}

export function AssetStatusBadge({ status }: AssetStatusBadgeProps) {
    const variants = {
        operational: 'success', // Assuming you have a success variant or use default/secondary
        maintenance: 'warning',
        down: 'destructive',
        retired: 'outline',
    };

    // Map to badge variants that likely exist or use styles
    const getVariant = (s: string) => {
        switch (s) {
            case 'operational': return 'default'; // Or specific color class
            case 'maintenance': return 'secondary';
            case 'down': return 'destructive';
            case 'retired': return 'outline';
            default: return 'default';
        }
    };

    const getLabel = (s: string) => {
        return s.charAt(0).toUpperCase() + s.slice(1);
    };

    return (
        <Badge variant={getVariant(status) as any}>
            {getLabel(status)}
        </Badge>
    );
}
