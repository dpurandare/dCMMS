'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
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
import { api } from '@/lib/api-client';
import type { AssetStatus } from '@/types/api';

export default function NewAssetPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    status: 'operational',
    siteId: '',
    location: '',
    description: '',
    serialNumber: '',
    manufacturer: '',
    model: '',
    parentAssetId: '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.type || !formData.siteId) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.assets.create({
        ...formData,
        status: formData.status as AssetStatus,
      });
      router.push('/assets');
    } catch (err: any) {
      console.error('Failed to create asset:', err);
      alert(err.response?.data?.message || 'Failed to create asset');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout
      title="New Asset"
      breadcrumbs={[
        { label: 'Home', href: '/dashboard' },
        { label: 'Assets', href: '/assets' },
        { label: 'New' },
      ]}
    >
      <PageHeader
        title="Create New Asset"
        description="Add a new asset to your inventory"
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Assets', href: '/assets' },
          { label: 'New' },
        ]}
        actions={
          <Button variant="outline" onClick={() => router.push('/assets')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        }
      />

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Asset Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Information */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Asset Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., Inverter 001"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  required
                />
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label htmlFor="type">
                  Asset Type <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.type} onValueChange={(v) => handleChange('type', v)}>
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select asset type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inverter">Inverter</SelectItem>
                    <SelectItem value="transformer">Transformer</SelectItem>
                    <SelectItem value="panel">Solar Panel</SelectItem>
                    <SelectItem value="battery">Battery</SelectItem>
                    <SelectItem value="turbine">Wind Turbine</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operational">Operational</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Site */}
              <div className="space-y-2">
                <Label htmlFor="siteId">
                  Site <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.siteId} onValueChange={(v) => handleChange('siteId', v)}>
                  <SelectTrigger id="siteId">
                    <SelectValue placeholder="Select a site" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="site-001">Demo Solar Farm</SelectItem>
                    <SelectItem value="site-002">Wind Farm North</SelectItem>
                    <SelectItem value="site-003">BESS Station 1</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="e.g., Building A, Floor 2"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                />
              </div>

              {/* Parent Asset */}
              <div className="space-y-2">
                <Label htmlFor="parentAssetId">Parent Asset (Optional)</Label>
                <Select
                  value={formData.parentAssetId}
                  onValueChange={(v) => handleChange('parentAssetId', v)}
                >
                  <SelectTrigger id="parentAssetId">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    <SelectItem value="asset-001">Main Transformer</SelectItem>
                    <SelectItem value="asset-002">Control Panel A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Additional Details */}
            <div className="grid gap-6 md:grid-cols-3">
              {/* Serial Number */}
              <div className="space-y-2">
                <Label htmlFor="serialNumber">Serial Number</Label>
                <Input
                  id="serialNumber"
                  placeholder="e.g., SN123456789"
                  value={formData.serialNumber}
                  onChange={(e) => handleChange('serialNumber', e.target.value)}
                />
              </div>

              {/* Manufacturer */}
              <div className="space-y-2">
                <Label htmlFor="manufacturer">Manufacturer</Label>
                <Input
                  id="manufacturer"
                  placeholder="e.g., Siemens"
                  value={formData.manufacturer}
                  onChange={(e) => handleChange('manufacturer', e.target.value)}
                />
              </div>

              {/* Model */}
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  placeholder="e.g., INV-5000"
                  value={formData.model}
                  onChange={(e) => handleChange('model', e.target.value)}
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                rows={4}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                placeholder="Enter asset description..."
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="mt-6 flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.push('/assets')}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Creating...' : 'Create Asset'}
          </Button>
        </div>
      </form>
    </DashboardLayout>
  );
}
