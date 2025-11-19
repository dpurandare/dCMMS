import { Badge } from '@/components/ui/badge';

interface ComplianceStatusBadgeProps {
  status: 'draft' | 'final' | 'submitted';
}

export function ComplianceStatusBadge({ status }: ComplianceStatusBadgeProps) {
  const variants: Record<string, { variant: any; label: string }> = {
    draft: {
      variant: 'secondary',
      label: 'Draft',
    },
    final: {
      variant: 'default',
      label: 'Final',
    },
    submitted: {
      variant: 'outline',
      label: 'Submitted',
    },
  };

  const config = variants[status] || variants.draft;

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
