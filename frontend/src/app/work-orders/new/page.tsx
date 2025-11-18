'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Loader2 } from 'lucide-react';

interface Site {
  id: string;
  name: string;
  siteCode: string;
}

export default function NewWorkOrderPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [sites, setSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'corrective',
    priority: 'medium',
    status: 'draft',
    siteId: '',
    scheduledStartDate: '',
    scheduledEndDate: '',
    estimatedHours: '',
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    fetchSites();
  }, [isAuthenticated]);

  const fetchSites = async () => {
    try {
      const response = await api.sites.list();
      setSites(response.data || []);
    } catch (error) {
      console.error('Error fetching sites:', error);
      setSites([]);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.siteId) {
      newErrors.siteId = 'Site is required';
    }

    if (formData.estimatedHours && isNaN(Number(formData.estimatedHours))) {
      newErrors.estimatedHours = 'Must be a valid number';
    }

    if (formData.scheduledStartDate && formData.scheduledEndDate) {
      const start = new Date(formData.scheduledStartDate);
      const end = new Date(formData.scheduledEndDate);
      if (end < start) {
        newErrors.scheduledEndDate = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const payload: any = {
        title: formData.title.trim(),
        type: formData.type,
        priority: formData.priority,
        status: formData.status,
        siteId: formData.siteId,
      };

      if (formData.description.trim()) {
        payload.description = formData.description.trim();
      }

      if (formData.scheduledStartDate) {
        payload.scheduledStartDate = new Date(formData.scheduledStartDate).toISOString();
      }

      if (formData.scheduledEndDate) {
        payload.scheduledEndDate = new Date(formData.scheduledEndDate).toISOString();
      }

      if (formData.estimatedHours) {
        payload.estimatedHours = Number(formData.estimatedHours);
      }

      const workOrder = await api.workOrders.create(payload);

      // Redirect to the created work order
      router.push(`/work-orders/${workOrder.id}`);
    } catch (error: any) {
      console.error('Error creating work order:', error);
      setErrors({
        general: error.response?.data?.message || 'Failed to create work order. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear field error when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push('/work-orders')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create Work Order</h1>
              <p className="text-sm text-gray-600 mt-1">Fill in the details to create a new work order</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {errors.general && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{errors.general}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Basic Information */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Basic Information</h2>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">
                    Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="Enter work order title"
                    className={errors.title ? 'border-red-500' : ''}
                    disabled={isLoading}
                  />
                  {errors.title && <p className="text-sm text-red-600 mt-1">{errors.title}</p>}
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Enter detailed description of the work to be done"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">
                      Type <span className="text-red-500">*</span>
                    </Label>
                    <select
                      id="type"
                      name="type"
                      value={formData.type}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isLoading}
                    >
                      <option value="corrective">Corrective</option>
                      <option value="preventive">Preventive</option>
                      <option value="predictive">Predictive</option>
                      <option value="inspection">Inspection</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="priority">
                      Priority <span className="text-red-500">*</span>
                    </Label>
                    <select
                      id="priority"
                      name="priority"
                      value={formData.priority}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isLoading}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isLoading}
                    >
                      <option value="draft">Draft</option>
                      <option value="open">Open</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="siteId">
                      Site <span className="text-red-500">*</span>
                    </Label>
                    <select
                      id="siteId"
                      name="siteId"
                      value={formData.siteId}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.siteId ? 'border-red-500' : 'border-gray-300'
                      }`}
                      disabled={isLoading}
                    >
                      <option value="">Select a site</option>
                      {sites.map((site) => (
                        <option key={site.id} value={site.id}>
                          {site.siteCode} - {site.name}
                        </option>
                      ))}
                    </select>
                    {errors.siteId && <p className="text-sm text-red-600 mt-1">{errors.siteId}</p>}
                  </div>
                </div>
              </div>
            </Card>

            {/* Schedule */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Schedule</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="scheduledStartDate">Scheduled Start Date</Label>
                  <Input
                    id="scheduledStartDate"
                    name="scheduledStartDate"
                    type="datetime-local"
                    value={formData.scheduledStartDate}
                    onChange={handleChange}
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <Label htmlFor="scheduledEndDate">Scheduled End Date</Label>
                  <Input
                    id="scheduledEndDate"
                    name="scheduledEndDate"
                    type="datetime-local"
                    value={formData.scheduledEndDate}
                    onChange={handleChange}
                    className={errors.scheduledEndDate ? 'border-red-500' : ''}
                    disabled={isLoading}
                  />
                  {errors.scheduledEndDate && (
                    <p className="text-sm text-red-600 mt-1">{errors.scheduledEndDate}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="estimatedHours">Estimated Hours</Label>
                  <Input
                    id="estimatedHours"
                    name="estimatedHours"
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.estimatedHours}
                    onChange={handleChange}
                    placeholder="0"
                    className={errors.estimatedHours ? 'border-red-500' : ''}
                    disabled={isLoading}
                  />
                  {errors.estimatedHours && (
                    <p className="text-sm text-red-600 mt-1">{errors.estimatedHours}</p>
                  )}
                </div>
              </div>
            </Card>

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/work-orders')}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Work Order'
                )}
              </Button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
