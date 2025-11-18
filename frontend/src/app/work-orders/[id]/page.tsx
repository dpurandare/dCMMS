'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Edit, Trash2, Wrench, PlayCircle, PauseCircle, CheckCircle, XCircle } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import {
  PageHeader,
  ConfirmDialog,
  WorkOrderStatusBadge,
  PriorityBadge,
  CardSkeleton,
} from '@/components/common';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';

interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  sequence: number;
}

interface Part {
  id: string;
  name: string;
  quantity: number;
  reserved: boolean;
  consumed: boolean;
}

interface WorkOrder {
  id: string;
  workOrderId: string;
  title: string;
  description?: string;
  type: string;
  priority: string;
  status: string;
  assignedTo?: {
    id: string;
    name: string;
  };
  asset?: {
    id: string;
    name: string;
  };
  site?: {
    id: string;
    name: string;
  };
  scheduledStartDate?: string;
  scheduledEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  tasks?: Task[];
  parts?: Part[];
  createdAt: string;
  updatedAt: string;
}

export default function WorkOrderDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const woId = params.id as string;
  const { isAuthenticated, logout } = useAuthStore();
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [transitionDialog, setTransitionDialog] = useState(false);
  const [transitionAction, setTransitionAction] = useState<string>('');
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    fetchWorkOrder();
  }, [isAuthenticated, woId, router]);

  const fetchWorkOrder = async () => {
    try {
      setIsLoading(true);
      const data = await api.workOrders.getById(woId);
      setWorkOrder(data.data || data);
    } catch (err: any) {
      console.error('Failed to fetch work order:', err);
      if (err.response?.status === 401) {
        logout();
        router.push('/auth/login');
      } else if (err.response?.status === 404) {
        router.push('/work-orders');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.workOrders.delete(woId);
      router.push('/work-orders');
    } catch (err) {
      console.error('Failed to delete work order:', err);
      alert('Failed to delete work order');
    }
  };

  const handleTransition = async () => {
    if (!transitionAction) return;

    try {
      setIsTransitioning(true);
      await api.workOrders.transition(woId, transitionAction);
      await fetchWorkOrder(); // Refresh data
      setTransitionDialog(false);
      setTransitionAction('');
    } catch (err: any) {
      console.error('Failed to transition work order:', err);
      alert(err.response?.data?.message || 'Failed to update work order status');
    } finally {
      setIsTransitioning(false);
    }
  };

  const getTransitionButtons = () => {
    if (!workOrder) return [];

    const buttons = [];
    const status = workOrder.status;

    if (status === 'draft' || status === 'scheduled') {
      buttons.push({
        label: 'Start',
        action: 'start',
        icon: PlayCircle,
        variant: 'default' as const,
      });
    }

    if (status === 'assigned' || status === 'in_progress') {
      buttons.push({
        label: 'Hold',
        action: 'hold',
        icon: PauseCircle,
        variant: 'outline' as const,
      });
    }

    if (status === 'on_hold') {
      buttons.push({
        label: 'Resume',
        action: 'resume',
        icon: PlayCircle,
        variant: 'default' as const,
      });
    }

    if (status === 'in_progress') {
      buttons.push({
        label: 'Complete',
        action: 'complete',
        icon: CheckCircle,
        variant: 'default' as const,
      });
    }

    if (status === 'completed') {
      buttons.push({
        label: 'Close',
        action: 'close',
        icon: CheckCircle,
        variant: 'default' as const,
      });
    }

    if (['draft', 'scheduled', 'assigned', 'on_hold'].includes(status)) {
      buttons.push({
        label: 'Cancel',
        action: 'cancel',
        icon: XCircle,
        variant: 'destructive' as const,
      });
    }

    return buttons;
  };

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

  if (isLoading) {
    return (
      <DashboardLayout
        title="Work Order Details"
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Work Orders', href: '/work-orders' },
          { label: 'Loading...' },
        ]}
      >
        <CardSkeleton count={1} />
      </DashboardLayout>
    );
  }

  if (!workOrder) {
    return (
      <DashboardLayout title="Work Order Not Found">
        <Card className="p-8 text-center">
          <Wrench className="mx-auto h-12 w-12 text-slate-400" />
          <h2 className="mt-4 text-lg font-semibold">Work order not found</h2>
          <p className="mt-2 text-sm text-slate-600">
            The work order you&apos;re looking for doesn&apos;t exist or has been deleted.
          </p>
          <Button onClick={() => router.push('/work-orders')} className="mt-4">
            Back to Work Orders
          </Button>
        </Card>
      </DashboardLayout>
    );
  }

  const transitionButtons = getTransitionButtons();

  return (
    <DashboardLayout
      title={workOrder.title}
      breadcrumbs={[
        { label: 'Home', href: '/dashboard' },
        { label: 'Work Orders', href: '/work-orders' },
        { label: workOrder.workOrderId },
      ]}
    >
      <PageHeader
        title={workOrder.title}
        description={`Work Order ID: ${workOrder.workOrderId}`}
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Work Orders', href: '/work-orders' },
          { label: workOrder.workOrderId },
        ]}
        actions={
          <>
            <Button variant="outline" onClick={() => router.push('/work-orders')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            {workOrder.status === 'draft' && (
              <Button variant="outline" onClick={() => router.push(`/work-orders/${woId}/edit`)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
            <Button variant="destructive" onClick={() => setDeleteDialog(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </>
        }
      />

      {/* Work Order Header Card with State Transitions */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle>{workOrder.title}</CardTitle>
              <p className="mt-1 text-sm text-slate-600">
                {workOrder.description || 'No description'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <PriorityBadge priority={workOrder.priority as any} />
              <WorkOrderStatusBadge status={workOrder.status as any} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* State Transition Buttons */}
          {transitionButtons.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2 border-b pb-4">
              {transitionButtons.map((btn) => {
                const Icon = btn.icon;
                return (
                  <Button
                    key={btn.action}
                    variant={btn.variant}
                    onClick={() => {
                      setTransitionAction(btn.action);
                      setTransitionDialog(true);
                    }}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {btn.label}
                  </Button>
                );
              })}
            </div>
          )}

          {/* Work Order Details Grid */}
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-sm font-medium text-slate-600">Type</dt>
              <dd className="mt-1 text-sm capitalize text-slate-900">{workOrder.type}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-600">Assigned To</dt>
              <dd className="mt-1 text-sm text-slate-900">
                {workOrder.assignedTo?.name || 'Unassigned'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-600">Asset</dt>
              <dd className="mt-1 text-sm text-slate-900">{workOrder.asset?.name || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-600">Site</dt>
              <dd className="mt-1 text-sm text-slate-900">{workOrder.site?.name || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-600">Scheduled Start</dt>
              <dd className="mt-1 text-sm text-slate-900">
                {formatDate(workOrder.scheduledStartDate)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-600">Scheduled End</dt>
              <dd className="mt-1 text-sm text-slate-900">
                {formatDate(workOrder.scheduledEndDate)}
              </dd>
            </div>
            {workOrder.actualStartDate && (
              <div>
                <dt className="text-sm font-medium text-slate-600">Actual Start</dt>
                <dd className="mt-1 text-sm text-slate-900">
                  {formatDate(workOrder.actualStartDate)}
                </dd>
              </div>
            )}
            {workOrder.actualEndDate && (
              <div>
                <dt className="text-sm font-medium text-slate-600">Actual End</dt>
                <dd className="mt-1 text-sm text-slate-900">
                  {formatDate(workOrder.actualEndDate)}
                </dd>
              </div>
            )}
            {workOrder.estimatedHours && (
              <div>
                <dt className="text-sm font-medium text-slate-600">Estimated Hours</dt>
                <dd className="mt-1 text-sm text-slate-900">{workOrder.estimatedHours}h</dd>
              </div>
            )}
            {workOrder.actualHours && (
              <div>
                <dt className="text-sm font-medium text-slate-600">Actual Hours</dt>
                <dd className="mt-1 text-sm text-slate-900">{workOrder.actualHours}h</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="tasks">
            Tasks
            {workOrder.tasks && workOrder.tasks.length > 0 && (
              <Badge variant="outline" className="ml-2">
                {workOrder.tasks.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="parts">Parts</TabsTrigger>
          <TabsTrigger value="labor">Labor</TabsTrigger>
          <TabsTrigger value="attachments">Attachments</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Work Order Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Detailed work order information and notes will be displayed here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Task Checklist</CardTitle>
            </CardHeader>
            <CardContent>
              {workOrder.tasks && workOrder.tasks.length > 0 ? (
                <div className="space-y-3">
                  {workOrder.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 rounded-lg border p-3 hover:bg-slate-50"
                    >
                      <Checkbox
                        checked={task.completed}
                        className="mt-1"
                        disabled={workOrder.status === 'completed' || workOrder.status === 'closed'}
                      />
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${task.completed ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="mt-1 text-xs text-slate-600">{task.description}</p>
                        )}
                      </div>
                      {task.completed && (
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          Done
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-600">No tasks defined for this work order.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Parts & Materials</CardTitle>
            </CardHeader>
            <CardContent>
              {workOrder.parts && workOrder.parts.length > 0 ? (
                <div className="space-y-2">
                  {workOrder.parts.map((part) => (
                    <div
                      key={part.id}
                      className="flex items-center justify-between border-b pb-2 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900">{part.name}</p>
                        <p className="text-xs text-slate-600">Quantity: {part.quantity}</p>
                      </div>
                      <Badge
                        variant={part.consumed ? 'default' : 'outline'}
                        className={part.consumed ? 'bg-green-100 text-green-700' : ''}
                      >
                        {part.consumed ? 'Consumed' : part.reserved ? 'Reserved' : 'Pending'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-600">No parts assigned to this work order.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="labor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Labor Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Labor tracking and time logging will be displayed here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attachments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Attachments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Work order documents, photos, and attachments will be displayed here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Status History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                    <div className="h-3 w-3 rounded-full bg-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">Created</p>
                    <p className="text-xs text-slate-600">{formatDate(workOrder.createdAt)}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600">
                  Full status change history and audit trail will be displayed here.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialog}
        onOpenChange={setDeleteDialog}
        title="Delete Work Order"
        description={`Are you sure you want to delete "${workOrder.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />

      {/* State Transition Confirmation Dialog */}
      <ConfirmDialog
        open={transitionDialog}
        onOpenChange={setTransitionDialog}
        title={`${transitionAction.charAt(0).toUpperCase() + transitionAction.slice(1)} Work Order`}
        description={`Are you sure you want to ${transitionAction} this work order?`}
        confirmLabel={transitionAction.charAt(0).toUpperCase() + transitionAction.slice(1)}
        variant={transitionAction === 'cancel' ? 'destructive' : 'default'}
        onConfirm={handleTransition}
        loading={isTransitioning}
      />
    </DashboardLayout>
  );
}
