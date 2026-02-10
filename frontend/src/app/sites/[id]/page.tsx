'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { api } from '@/lib/api-client';
import type { Site } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Trash2, MapPin, Phone, Mail } from 'lucide-react';

export default function SiteDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [site, setSite] = useState<Site | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    fetchSite();
  }, [isAuthenticated, params.id]);

  const fetchSite = async () => {
    setIsLoading(true);
    try {
      const data = await api.sites.getById(params.id);
      setSite(data);
    } catch (error) {
      console.error('Error fetching site:', error);
      router.push('/sites');
    } finally {
      setIsLoading(false);
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
        <p className="text-gray-600">Loading site...</p>
      </div>
    );
  }

  if (!site) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push('/sites')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{site.name}</h1>
                <p className="text-sm text-gray-600 mt-1 font-mono">{site.siteCode}</p>
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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Overview</h2>
                <Badge className={site.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                  {site.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="mt-1 text-gray-900">{site.description || 'No description provided'}</p>
                </div>

                {site.type && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Type</label>
                    <p className="mt-1 text-gray-900">{site.type}</p>
                  </div>
                )}

                {site.timezone && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Timezone</label>
                    <p className="mt-1 text-gray-900">{site.timezone}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Location */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-5 w-5 text-gray-400" />
                <h2 className="text-lg font-semibold">Location</h2>
              </div>
              <div className="space-y-3">
                {site.address && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Address</label>
                    <p className="mt-1 text-gray-900">{site.address}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  {site.city && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">City</label>
                      <p className="mt-1 text-gray-900">{site.city}</p>
                    </div>
                  )}
                  {site.state && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">State</label>
                      <p className="mt-1 text-gray-900">{site.state}</p>
                    </div>
                  )}
                  {site.postalCode && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Postal Code</label>
                      <p className="mt-1 text-gray-900">{site.postalCode}</p>
                    </div>
                  )}
                  {site.country && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Country</label>
                      <p className="mt-1 text-gray-900">{site.country}</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Contact Information */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
              <div className="space-y-3">
                {site.contactName && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Contact Name</label>
                    <p className="mt-1 text-gray-900">{site.contactName}</p>
                  </div>
                )}
                {site.contactEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <a href={`mailto:${site.contactEmail}`} className="text-blue-600 hover:underline">
                      {site.contactEmail}
                    </a>
                  </div>
                )}
                {site.contactPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <a href={`tel:${site.contactPhone}`} className="text-blue-600 hover:underline">
                      {site.contactPhone}
                    </a>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Quick Stats</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Total Assets</label>
                  <p className="mt-1 text-3xl font-bold text-gray-900">{site.assetCount}</p>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push(`/assets?siteId=${site.id}`)}
                >
                  View Assets
                </Button>
              </div>
            </Card>

            {/* Metadata */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Metadata</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <label className="font-medium text-gray-500">Site Code</label>
                  <p className="mt-1 text-gray-900 font-mono">{site.siteCode}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-500">Created</label>
                  <p className="mt-1 text-gray-900">{formatDate(site.createdAt)}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-500">Last Updated</label>
                  <p className="mt-1 text-gray-900">{formatDate(site.updatedAt)}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-500">Site ID</label>
                  <p className="mt-1 text-gray-900 font-mono text-xs break-all">{site.id}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
