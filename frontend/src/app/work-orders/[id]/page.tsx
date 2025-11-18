'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';

interface WorkOrderTask {
  id: string;
  title: string;
  description: string;
  status: string;
  sequence: number;
  estimatedHours: number;
  actualHours: number | null;
}

interface WorkOrder {
  id: string;
  workOrderId: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  status: string;
  scheduledStartDate: string | null;
  scheduledEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  estimatedHours: number | null;
  actualHours: number | null;
  createdAt: string;
  updatedAt: string;
  tasks: WorkOrderTask[];
}

export default function WorkOrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    fetchWorkOrder();
  }, [isAuthenticated, params.id]);

  const fetchWorkOrder = async () => {
    setIsLoading(true);
    try {
      const data = await api.workOrders.getById(params.id);
      setWorkOrder(data);
    } catch (error) {
      console.error('Error fetching work order:', error);
      // Redirect to list if not found
      router.push('/work-orders');
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'open':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'on_hold':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading work order...</p>
      </div>
    );
  }

  if (!workOrder) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push('/work-orders')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{workOrder.workOrderId}</h1>
                <p className="text-sm text-gray-600 mt-1">{workOrder.title}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="outline" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Overview */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Overview</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="mt-1 text-gray-900">{workOrder.description || 'No description provided'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Type</label>
                    <p className="mt-1 text-gray-900 capitalize">{workOrder.type.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Priority</label>
                    <div className="mt-1">
                      <Badge className={getPriorityColor(workOrder.priority)}>
                        {workOrder.priority}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    <Badge className={getStatusColor(workOrder.status)}>
                      {workOrder.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>

            {/* Schedule */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Schedule</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Scheduled Start</label>
                  <p className="mt-1 text-gray-900">{formatDate(workOrder.scheduledStartDate)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Scheduled End</label>
                  <p className="mt-1 text-gray-900">{formatDate(workOrder.scheduledEndDate)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Actual Start</label>
                  <p className="mt-1 text-gray-900">{formatDate(workOrder.actualStartDate)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Actual End</label>
                  <p className="mt-1 text-gray-900">{formatDate(workOrder.actualEndDate)}</p>
                </div>
              </div>
            </Card>

            {/* Tasks */}
            {workOrder.tasks && workOrder.tasks.length > 0 && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Tasks</h2>
                <div className="space-y-3">
                  {workOrder.tasks.sort((a, b) => a.sequence - b.sequence).map((task) => (
                    <div key={task.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{task.title}</h3>
                          {task.description && (
                            <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                          )}
                          <div className="flex gap-4 mt-2 text-sm text-gray-500">
                            <span>Est: {task.estimatedHours}h</span>
                            {task.actualHours && <span>Actual: {task.actualHours}h</span>}
                          </div>
                        </div>
                        <Badge className={getStatusColor(task.status)}>
                          {task.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Time Tracking */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Time Tracking</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Estimated Hours</label>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">
                    {workOrder.estimatedHours || '-'}h
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Actual Hours</label>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">
                    {workOrder.actualHours || '-'}h
                  </p>
                </div>
                {workOrder.estimatedHours && workOrder.actualHours && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Variance</label>
                    <p
                      className={`mt-1 text-lg font-semibold ${
                        workOrder.actualHours > workOrder.estimatedHours
                          ? 'text-red-600'
                          : 'text-green-600'
                      }`}
                    >
                      {workOrder.actualHours > workOrder.estimatedHours ? '+' : ''}
                      {workOrder.actualHours - workOrder.estimatedHours}h
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Metadata */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Metadata</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <label className="font-medium text-gray-500">Created</label>
                  <p className="mt-1 text-gray-900">{formatDate(workOrder.createdAt)}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-500">Last Updated</label>
                  <p className="mt-1 text-gray-900">{formatDate(workOrder.updatedAt)}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-500">Work Order ID</label>
                  <p className="mt-1 text-gray-900 font-mono text-xs">{workOrder.id}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
