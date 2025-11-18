'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';

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
}

export default function AssetDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [asset, setAsset] = useState<Asset | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    fetchAsset();
  }, [isAuthenticated, params.id]);

  const fetchAsset = async () => {
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
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'down':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'retired':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCriticalityColor = (criticality: string) => {
    switch (criticality) {
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading asset...</p>
      </div>
    );
  }

  if (!asset) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push('/assets')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{asset.name}</h1>
                <p className="text-sm text-gray-600 mt-1 font-mono">{asset.assetTag}</p>
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
                  <p className="mt-1 text-gray-900">{asset.description || 'No description provided'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Type</label>
                    <p className="mt-1 text-gray-900">{asset.type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <div className="mt-1">
                      <Badge className={getStatusColor(asset.status)}>{asset.status}</Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Criticality</label>
                    <div className="mt-1">
                      <Badge className={getCriticalityColor(asset.criticality)}>{asset.criticality}</Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Location</label>
                    <p className="mt-1 text-gray-900">{asset.location || '-'}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Equipment Details */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Equipment Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Manufacturer</label>
                  <p className="mt-1 text-gray-900">{asset.manufacturer || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Model</label>
                  <p className="mt-1 text-gray-900">{asset.model || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Serial Number</label>
                  <p className="mt-1 text-gray-900 font-mono text-sm">{asset.serialNumber || '-'}</p>
                </div>
              </div>
            </Card>

            {/* Dates */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Important Dates</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Installation Date</label>
                  <p className="mt-1 text-gray-900">{formatDate(asset.installationDate)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Warranty Expiry</label>
                  <p className="mt-1 text-gray-900">{formatDate(asset.warrantyExpiryDate)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Last Maintenance</label>
                  <p className="mt-1 text-gray-900">{formatDate(asset.lastMaintenanceDate)}</p>
                </div>
              </div>
            </Card>

            {/* Specifications */}
            {asset.specifications && Object.keys(asset.specifications).length > 0 && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Specifications</h2>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(asset.specifications).map(([key, value]) => (
                    <div key={key}>
                      <label className="text-sm font-medium text-gray-500 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </label>
                      <p className="mt-1 text-gray-900">{String(value)}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Child Assets */}
            {asset.children && asset.children.length > 0 && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Child Assets</h2>
                <div className="space-y-2">
                  {asset.children.map((child) => (
                    <div
                      key={child.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/assets/${child.id}`)}
                    >
                      <div>
                        <p className="font-medium text-gray-900">{child.name}</p>
                        <p className="text-sm text-gray-500 font-mono">{child.assetTag}</p>
                      </div>
                      <Badge className={getStatusColor(child.status)}>{child.status}</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Quick Info</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <label className="font-medium text-gray-500">Asset Tag</label>
                  <p className="mt-1 text-gray-900 font-mono">{asset.assetTag}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-500">Child Assets</label>
                  <p className="mt-1 text-gray-900">{asset.children?.length || 0}</p>
                </div>
              </div>
            </Card>

            {/* Metadata */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Metadata</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <label className="font-medium text-gray-500">Created</label>
                  <p className="mt-1 text-gray-900">{formatDate(asset.createdAt)}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-500">Last Updated</label>
                  <p className="mt-1 text-gray-900">{formatDate(asset.updatedAt)}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-500">Asset ID</label>
                  <p className="mt-1 text-gray-900 font-mono text-xs break-all">{asset.id}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
