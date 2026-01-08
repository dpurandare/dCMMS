'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wrench, Plus, Search, Filter, MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import {
  PageHeader,
  EmptyState,
  TableSkeleton,
  ConfirmDialog,
  WorkOrderStatusBadge,
  PriorityBadge,
} from '@/components/common';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card } from '@/components/ui/card';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { PermissionGuard } from '@/components/auth/PermissionGuard';

interface WorkOrder {
  id: string;
  workOrderId: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  assignedTo?: {
    id: string;
    name: string;
  };
  scheduledStartDate?: string;
  asset?: {
    id: string;
    name: string;
  };
}

export default function WorkOrdersPage() {
  return (
    <PermissionGuard permission="work-orders.view" showAccessDenied>
      <WorkOrdersContent />
    </PermissionGuard>
  );
}

function WorkOrdersContent() {
  const router = useRouter();
  const { isAuthenticated, logout } = useAuthStore();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    fetchWorkOrders();
  }, [isAuthenticated, router]);

  const fetchWorkOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.workOrders.list();
      setWorkOrders(data.data || []);
    } catch (err: any) {
      console.error('Failed to fetch work orders:', err);
      setError(err.message || 'Failed to load work orders');
      if (err.response?.status === 401) {
        logout();
        router.push('/auth/login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedWO) return;

    try {
      await api.workOrders.delete(selectedWO.id);
      setWorkOrders(workOrders.filter((wo) => wo.id !== selectedWO.id));
      setDeleteDialog(false);
      setSelectedWO(null);
    } catch (err) {
      console.error('Failed to delete work order:', err);
      alert('Failed to delete work order');
    }
  };

  const filteredWorkOrders = workOrders.filter((wo) => {
    const matchesSearch =
      searchQuery === '' ||
      wo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.workOrderId.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || wo.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || wo.priority === priorityFilter;
    const matchesType = typeFilter === 'all' || wo.type === typeFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesType;
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <DashboardLayout
      title="Work Orders"
      breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Work Orders' }]}
      showNewButton={false}
    >
      <PageHeader
        title="Work Orders"
        description="Manage maintenance and repair tasks across all sites"
        breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Work Orders' }]}
        actions={
          <Button onClick={() => router.push('/work-orders/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Work Order
          </Button>
        }
      />

      {/* Filters and Search */}
      <Card className="mb-6 p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by title or WO ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          {/* Priority Filter */}
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          {/* Type Filter */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="corrective">Corrective</SelectItem>
              <SelectItem value="preventive">Preventive</SelectItem>
              <SelectItem value="predictive">Predictive</SelectItem>
              <SelectItem value="inspection">Inspection</SelectItem>
              <SelectItem value="emergency">Emergency</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear Filters */}
          {(searchQuery ||
            statusFilter !== 'all' ||
            priorityFilter !== 'all' ||
            typeFilter !== 'all') && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setPriorityFilter('all');
                  setTypeFilter('all');
                }}
              >
                Clear
              </Button>
            )}
        </div>
      </Card>

      {/* Loading State */}
      {isLoading && <TableSkeleton rows={5} columns={7} />}

      {/* Error State */}
      {!isLoading && error && (
        <Card className="p-8 text-center">
          <p className="text-red-600">Error: {error}</p>
          <Button onClick={fetchWorkOrders} variant="outline" className="mt-4">
            Retry
          </Button>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredWorkOrders.length === 0 && workOrders.length === 0 && (
        <EmptyState
          icon={Wrench}
          title="No work orders found"
          description="Get started by creating your first work order to track maintenance tasks."
          action={{
            label: 'Create Work Order',
            onClick: () => router.push('/work-orders/new'),
          }}
        />
      )}

      {/* No Results State */}
      {!isLoading &&
        !error &&
        filteredWorkOrders.length === 0 &&
        workOrders.length > 0 && (
          <EmptyState
            icon={Filter}
            title="No matching work orders"
            description="Try adjusting your search or filter criteria."
          />
        )}

      {/* Work Orders Table */}
      {!isLoading && !error && filteredWorkOrders.length > 0 && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>WO ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWorkOrders.map((wo) => (
                <TableRow
                  key={wo.id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => router.push(`/work-orders/${wo.id}`)}
                >
                  <TableCell className="font-mono text-xs">{wo.workOrderId}</TableCell>
                  <TableCell className="font-medium max-w-xs truncate">{wo.title}</TableCell>
                  <TableCell className="capitalize">{wo.type}</TableCell>
                  <TableCell>
                    <PriorityBadge priority={wo.priority as any} />
                  </TableCell>
                  <TableCell>
                    <WorkOrderStatusBadge status={wo.status as any} />
                  </TableCell>
                  <TableCell>{wo.assignedTo?.name || 'Unassigned'}</TableCell>
                  <TableCell className="text-slate-600">
                    {formatDate(wo.scheduledStartDate)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/work-orders/${wo.id}`);
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/work-orders/${wo.id}/edit`);
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedWO(wo);
                            setDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Results Count */}
          <div className="border-t px-6 py-4 text-sm text-slate-600">
            Showing {filteredWorkOrders.length} of {workOrders.length} work orders
          </div>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialog}
        onOpenChange={setDeleteDialog}
        title="Delete Work Order"
        description={`Are you sure you want to delete "${selectedWO?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </DashboardLayout>
  );
}
