'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Plus, X } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { PageHeader } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api-client';

interface Task {
  id: string;
  title: string;
  description: string;
  sequence: number;
}

interface Part {
  id: string;
  partId: string;
  name: string;
  quantity: number;
}

export default function NewWorkOrderPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTab, setCurrentTab] = useState('basic');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'corrective',
    priority: 'medium',
    assetId: '',
    siteId: '',
    assignedToId: '',
    scheduledStartDate: '',
    scheduledEndDate: '',
    estimatedHours: '',
  });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState({ title: '', description: '' });
  const [parts, setParts] = useState<Part[]>([]);
  const [newPart, setNewPart] = useState({ partId: '', name: '', quantity: 1 });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Auto-fill site when asset is selected (in real app, fetch from API)
    if (field === 'assetId' && value) {
      setFormData((prev) => ({ ...prev, siteId: 'site-001' }));
    }
  };

  const handleAddTask = () => {
    if (!newTask.title) return;

    const task: Task = {
      id: `task-${Date.now()}`,
      title: newTask.title,
      description: newTask.description,
      sequence: tasks.length + 1,
    };

    setTasks([...tasks, task]);
    setNewTask({ title: '', description: '' });
  };

  const handleRemoveTask = (id: string) => {
    setTasks(tasks.filter((t) => t.id !== id));
  };

  const handleAddPart = () => {
    if (!newPart.name || !newPart.quantity) return;

    const part: Part = {
      id: `part-${Date.now()}`,
      partId: newPart.partId || `part-${Date.now()}`,
      name: newPart.name,
      quantity: newPart.quantity,
    };

    setParts([...parts, part]);
    setNewPart({ partId: '', name: '', quantity: 1 });
  };

  const handleRemovePart = (id: string) => {
    setParts(parts.filter((p) => p.id !== id));
  };

  const handleSubmit = async (saveAsDraft: boolean = false) => {
    if (!formData.title || !formData.assetId) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      const submitData = {
        ...formData,
        status: saveAsDraft ? 'draft' : 'scheduled',
        estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : null,
        tasks: tasks.map((t) => ({
          title: t.title,
          description: t.description,
          sequence: t.sequence,
        })),
        parts: parts.map((p) => ({
          partId: p.partId,
          quantity: p.quantity,
        })),
      };

      await api.workOrders.create(submitData);
      router.push('/work-orders');
    } catch (err: any) {
      console.error('Failed to create work order:', err);
      alert(err.response?.data?.message || 'Failed to create work order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout
      title="New Work Order"
      breadcrumbs={[
        { label: 'Home', href: '/dashboard' },
        { label: 'Work Orders', href: '/work-orders' },
        { label: 'New' },
      ]}
    >
      <PageHeader
        title="Create Work Order"
        description="Create a new maintenance or repair work order"
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Work Orders', href: '/work-orders' },
          { label: 'New' },
        ]}
        actions={
          <Button variant="outline" onClick={() => router.push('/work-orders')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        }
      />

      <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="basic">1. Basic Info</TabsTrigger>
          <TabsTrigger value="tasks">
            2. Tasks
            {tasks.length > 0 && (
              <Badge variant="outline" className="ml-2">
                {tasks.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="parts">
            3. Parts
            {parts.length > 0 && (
              <Badge variant="outline" className="ml-2">
                {parts.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Step 1: Basic Information */}
        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Work Order Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">
                  Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="e.g., Replace inverter cooling fan"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  rows={4}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  placeholder="Describe the work to be performed..."
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Type */}
                <div className="space-y-2">
                  <Label htmlFor="type">Work Order Type</Label>
                  <Select value={formData.type} onValueChange={(v) => handleChange('type', v)}>
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corrective">Corrective</SelectItem>
                      <SelectItem value="preventive">Preventive</SelectItem>
                      <SelectItem value="predictive">Predictive</SelectItem>
                      <SelectItem value="inspection">Inspection</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority */}
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={formData.priority} onValueChange={(v) => handleChange('priority', v)}>
                    <SelectTrigger id="priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Asset */}
                <div className="space-y-2">
                  <Label htmlFor="assetId">
                    Asset <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formData.assetId} onValueChange={(v) => handleChange('assetId', v)}>
                    <SelectTrigger id="assetId">
                      <SelectValue placeholder="Select an asset" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asset-001">Inverter 001</SelectItem>
                      <SelectItem value="asset-002">Transformer A</SelectItem>
                      <SelectItem value="asset-003">Solar Panel Array B</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Site (Auto-filled) */}
                <div className="space-y-2">
                  <Label htmlFor="siteId">Site</Label>
                  <Select value={formData.siteId} onValueChange={(v) => handleChange('siteId', v)} disabled>
                    <SelectTrigger id="siteId">
                      <SelectValue placeholder="Auto-filled from asset" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="site-001">Demo Solar Farm</SelectItem>
                      <SelectItem value="site-002">Wind Farm North</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">Automatically filled based on selected asset</p>
                </div>

                {/* Assigned To */}
                <div className="space-y-2">
                  <Label htmlFor="assignedToId">Assign To</Label>
                  <Select value={formData.assignedToId} onValueChange={(v) => handleChange('assignedToId', v)}>
                    <SelectTrigger id="assignedToId">
                      <SelectValue placeholder="Select a technician" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
                      <SelectItem value="user-001">John Smith</SelectItem>
                      <SelectItem value="user-002">Jane Doe</SelectItem>
                      <SelectItem value="user-003">Mike Johnson</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Estimated Hours */}
                <div className="space-y-2">
                  <Label htmlFor="estimatedHours">Estimated Hours</Label>
                  <Input
                    id="estimatedHours"
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="e.g., 4.5"
                    value={formData.estimatedHours}
                    onChange={(e) => handleChange('estimatedHours', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Scheduled Start Date */}
                <div className="space-y-2">
                  <Label htmlFor="scheduledStartDate">Scheduled Start Date</Label>
                  <Input
                    id="scheduledStartDate"
                    type="date"
                    value={formData.scheduledStartDate}
                    onChange={(e) => handleChange('scheduledStartDate', e.target.value)}
                  />
                </div>

                {/* Scheduled End Date */}
                <div className="space-y-2">
                  <Label htmlFor="scheduledEndDate">Scheduled End Date</Label>
                  <Input
                    id="scheduledEndDate"
                    type="date"
                    value={formData.scheduledEndDate}
                    onChange={(e) => handleChange('scheduledEndDate', e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setCurrentTab('tasks')}>
                  Next: Add Tasks
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step 2: Tasks */}
        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle>Task Checklist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add Task Form */}
              <div className="rounded-lg border border-dashed p-4">
                <h4 className="mb-3 text-sm font-medium">Add Task</h4>
                <div className="space-y-3">
                  <Input
                    placeholder="Task title"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  />
                  <Input
                    placeholder="Task description (optional)"
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  />
                  <Button onClick={handleAddTask} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Task
                  </Button>
                </div>
              </div>

              {/* Tasks List */}
              {tasks.length > 0 ? (
                <div className="space-y-2">
                  {tasks.map((task, index) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 rounded-lg border p-3"
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-slate-600">{task.description}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveTask(task.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-600">No tasks added yet. Tasks are optional.</p>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentTab('basic')}>
                  Back
                </Button>
                <Button onClick={() => setCurrentTab('parts')}>
                  Next: Add Parts
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step 3: Parts */}
        <TabsContent value="parts">
          <Card>
            <CardHeader>
              <CardTitle>Parts & Materials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add Part Form */}
              <div className="rounded-lg border border-dashed p-4">
                <h4 className="mb-3 text-sm font-medium">Add Part</h4>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="md:col-span-2">
                    <Input
                      placeholder="Part name"
                      value={newPart.name}
                      onChange={(e) => setNewPart({ ...newPart, name: e.target.value })}
                    />
                  </div>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={newPart.quantity}
                    onChange={(e) => setNewPart({ ...newPart, quantity: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <Button onClick={handleAddPart} size="sm" className="mt-3">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Part
                </Button>
              </div>

              {/* Parts List */}
              {parts.length > 0 ? (
                <div className="space-y-2">
                  {parts.map((part) => (
                    <div
                      key={part.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">{part.name}</p>
                        <p className="text-xs text-slate-600">Quantity: {part.quantity}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemovePart(part.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-600">No parts added yet. Parts are optional.</p>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentTab('tasks')}>
                  Back
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Form Actions */}
      <div className="mt-6 flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/work-orders')}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => handleSubmit(true)}
          disabled={isSubmitting}
        >
          Save as Draft
        </Button>
        <Button
          type="button"
          onClick={() => handleSubmit(false)}
          disabled={isSubmitting}
        >
          <Save className="mr-2 h-4 w-4" />
          {isSubmitting ? 'Creating...' : 'Create & Schedule'}
        </Button>
      </div>
    </DashboardLayout>
  );
}
