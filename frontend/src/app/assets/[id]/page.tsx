'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { PageHeader } from '@/components/ui/page-header';
import { CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AssetStatusBadge } from '@/components/assets/asset-status-badge';
import { CardSkeleton } from '@/components/ui/card-skeleton';
import { Package } from 'lucide-react';

interface Asset {
  id: string;
  assetTag: string;
  name: string;
  description: string;
  type: string;
  status: string;
  criticality: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  location: string;
  installationDate: string | null;
  warrantyExpiryDate: string | null;
  lastMaintenanceDate: string | null;
  specifications: any;
  children: any[];
  createdAt: string;
  updatedAt: string;
  assetType?: string; // Add optional property if needed or fix usage
  site?: { name: string };
  installDate?: string;
  parentAsset?: { name: string };
  tags?: string[];
}

export default function AssetDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [asset, setAsset] = useState<Asset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState(false);

  const fetchAsset = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.assets.getById(params.id);
      setAsset(data);
    } catch (error) {
      console.error('Error fetching asset:', error);
      router.push('/assets');
    } finally {
      setIsLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    fetchAsset();
  }, [isAuthenticated, router, fetchAsset]);

  const handleDelete = async () => {
    try {
      await api.assets.delete(params.id);
      router.push('/assets');
    } catch (err) {
      console.error('Failed to delete asset:', err);
      alert('Failed to delete asset');
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <DashboardLayout
        title="Asset Details"
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Assets', href: '/assets' },
          { label: 'Loading...' },
        ]}
      >
        <CardSkeleton count={1} />
      </DashboardLayout>
    );
  }

  if (!asset) {
    return (
      <DashboardLayout title="Asset Not Found">
        <Card className="p-8 text-center">
          <Package className="mx-auto h-12 w-12 text-slate-400" />
          <h2 className="mt-4 text-lg font-semibold">Asset not found</h2>
          <p className="mt-2 text-sm text-slate-600">
            The asset you&apos;re looking for doesn&apos;t exist or has been deleted.
          </p>
          <Button onClick={() => router.push('/assets')} className="mt-4">
            Back to Assets
          </Button>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={asset.name}
      breadcrumbs={[
        { label: 'Home', href: '/dashboard' },
        { label: 'Assets', href: '/assets' },
        { label: asset.name },
      ]}
    >
      <PageHeader
        title={asset.name}
        description={`Asset ID: ${asset.id}`}
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Assets', href: '/assets' },
          { label: asset.name },
        ]}
        actions={
          <>
            <Button variant="outline" onClick={() => router.push('/assets')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button variant="outline" onClick={() => router.push(`/assets/${params.id}/edit`)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button variant="destructive" onClick={() => setDeleteDialog(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </>
        }
      />

      {/* Asset Details Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>{asset.name}</CardTitle>
              <p className="mt-1 text-sm text-slate-600">{asset.description || 'No description'}</p>
            </div>
            <AssetStatusBadge status={asset.status as any} />
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-sm font-medium text-slate-600">Asset Type</dt>
              <dd className="mt-1 text-sm capitalize text-slate-900">{asset.assetType}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-600">Site</dt>
              <dd className="mt-1 text-sm text-slate-900">{asset.site?.name || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-600">Location</dt>
              <dd className="mt-1 text-sm text-slate-900">{asset.location || 'N/A'}</dd>
            </div>
            {asset.serialNumber && (
              <div>
                <dt className="text-sm font-medium text-slate-600">Serial Number</dt>
                <dd className="mt-1 font-mono text-sm text-slate-900">{asset.serialNumber}</dd>
              </div>
            )}
            {asset.manufacturer && (
              <div>
                <dt className="text-sm font-medium text-slate-600">Manufacturer</dt>
                <dd className="mt-1 text-sm text-slate-900">{asset.manufacturer}</dd>
              </div>
            )}
            {asset.model && (
              <div>
                <dt className="text-sm font-medium text-slate-600">Model</dt>
                <dd className="mt-1 text-sm text-slate-900">{asset.model}</dd>
              </div>
            )}
            {asset.installDate && (
              <div>
                <dt className="text-sm font-medium text-slate-600">Install Date</dt>
                <dd className="mt-1 text-sm text-slate-900">
                  {new Date(asset.installDate).toLocaleDateString()}
                </dd>
              </div>
            )}
            {asset.parentAsset && (
              <div>
                <dt className="text-sm font-medium text-slate-600">Parent Asset</dt>
                <dd className="mt-1 text-sm text-slate-900">{asset.parentAsset.name}</dd>
              </div>
            )}
          </dl>

          {/* Tags */}
          {asset.tags && asset.tags.length > 0 && (
            <div className="mt-4">
              <dt className="text-sm font-medium text-slate-600">Tags</dt>
              <dd className="mt-2 flex flex-wrap gap-2">
                {asset.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </dd>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="hierarchy">Hierarchy</TabsTrigger>
          <TabsTrigger value="work-orders">Work Orders</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="telemetry">Telemetry</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Asset Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Detailed asset information and specifications will be displayed here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hierarchy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Asset Hierarchy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Asset hierarchy tree view will be displayed here showing parent and child assets.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="work-orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Related Work Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Work orders associated with this asset will be listed here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Asset documents, manuals, and attachments will be displayed here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="telemetry" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Telemetry Data</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Real-time and historical telemetry data will be displayed here in Sprint 6+.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialog}
        onOpenChange={setDeleteDialog}
        title="Delete Asset"
        description={`Are you sure you want to delete "${asset.name}"? This action cannot be undone and will remove all associated data.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </DashboardLayout>
  );
}
