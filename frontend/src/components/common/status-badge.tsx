import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Work Order Status Types
export type WorkOrderStatus =
  | 'draft'
  | 'scheduled'
  | 'assigned'
  | 'in_progress'
  | 'on_hold'
  | 'completed'
  | 'closed'
  | 'cancelled';

// Asset Status Types
export type AssetStatus =
  | 'operational'
  | 'maintenance'
  | 'failed'
  | 'offline'
  | 'decommissioned';

// Priority Types
export type Priority = 'critical' | 'high' | 'medium' | 'low';

interface StatusBadgeProps {
  status: WorkOrderStatus | AssetStatus | Priority | string;
  type?: 'workOrder' | 'asset' | 'priority' | 'custom';
  className?: string;
}

// Status configurations
const workOrderStatusConfig: Record<
  WorkOrderStatus,
  { label: string; className: string }
> = {
  draft: {
    label: 'Draft',
    className: 'bg-slate-100 text-slate-700 hover:bg-slate-100',
  },
  scheduled: {
    label: 'Scheduled',
    className: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  },
  assigned: {
    label: 'Assigned',
    className: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-100',
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100',
  },
  on_hold: {
    label: 'On Hold',
    className: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
  },
  completed: {
    label: 'Completed',
    className: 'bg-green-100 text-green-700 hover:bg-green-100',
  },
  closed: {
    label: 'Closed',
    className: 'bg-slate-100 text-slate-600 hover:bg-slate-100',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-red-100 text-red-700 hover:bg-red-100',
  },
};

const assetStatusConfig: Record<
  AssetStatus,
  { label: string; className: string }
> = {
  operational: {
    label: 'Operational',
    className: 'bg-green-100 text-green-700 hover:bg-green-100',
  },
  maintenance: {
    label: 'Maintenance',
    className: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100',
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-100 text-red-700 hover:bg-red-100',
  },
  offline: {
    label: 'Offline',
    className: 'bg-slate-100 text-slate-600 hover:bg-slate-100',
  },
  decommissioned: {
    label: 'Decommissioned',
    className: 'bg-slate-100 text-slate-500 hover:bg-slate-100',
  },
};

const priorityConfig: Record<Priority, { label: string; className: string }> =
  {
    critical: {
      label: 'Critical',
      className: 'bg-red-500 text-white hover:bg-red-500',
    },
    high: {
      label: 'High',
      className: 'bg-orange-500 text-white hover:bg-orange-500',
    },
    medium: {
      label: 'Medium',
      className: 'bg-yellow-500 text-white hover:bg-yellow-500',
    },
    low: {
      label: 'Low',
      className: 'bg-slate-400 text-white hover:bg-slate-400',
    },
  };

export function StatusBadge({
  status,
  type = 'workOrder',
  className,
}: StatusBadgeProps) {
  let config:
    | { label: string; className: string }
    | undefined;

  // Get configuration based on type
  if (type === 'workOrder') {
    config = workOrderStatusConfig[status as WorkOrderStatus];
  } else if (type === 'asset') {
    config = assetStatusConfig[status as AssetStatus];
  } else if (type === 'priority') {
    config = priorityConfig[status as Priority];
  }

  // Fallback for custom or unknown statuses
  if (!config) {
    config = {
      label: status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' '),
      className: 'bg-slate-100 text-slate-700 hover:bg-slate-100',
    };
  }

  return (
    <Badge className={cn(config.className, 'font-medium', className)}>
      {config.label}
    </Badge>
  );
}

// Convenience components
export function WorkOrderStatusBadge({
  status,
  className,
}: {
  status: WorkOrderStatus;
  className?: string;
}) {
  return <StatusBadge status={status} type="workOrder" className={className} />;
}

export function AssetStatusBadge({
  status,
  className,
}: {
  status: AssetStatus;
  className?: string;
}) {
  return <StatusBadge status={status} type="asset" className={className} />;
}

export function PriorityBadge({
  priority,
  className,
}: {
  priority: Priority;
  className?: string;
}) {
  return <StatusBadge status={priority} type="priority" className={className} />;
}
