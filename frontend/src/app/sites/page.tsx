'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Search, Plus, MapPin } from 'lucide-react';

interface Site {
  id: string;
  siteCode: string;
  name: string;
  type: string;
  city: string;
  state: string;
  country: string;
  isActive: boolean;
  assetCount?: number;
}

export default function SitesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [sites, setSites] = useState<Site[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    fetchSites();
  }, [isAuthenticated, pagination.page, statusFilter]);

  const fetchSites = async () => {
    setIsLoading(true);
    try {
      const response = await api.sites.list();
      setSites(response.data || []);
      setPagination(response.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch (error) {
      console.error('Error fetching sites:', error);
      setSites([]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sites</h1>
              <p className="text-sm text-gray-600 mt-1">Manage facility locations</p>
            </div>
            <Button onClick={() => alert('Site creation coming soon')}>
              <Plus className="mr-2 h-4 w-4" />
              New Site
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search sites..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchSites()}
                  className="pl-10"
                />
              </div>
            </div>

            <select
              className="border rounded-md px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Sites</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </Card>

        {/* Sites Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading sites...</p>
          </div>
        ) : sites.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-gray-600 mb-4">No sites found</p>
            <Button onClick={() => alert('Site creation coming soon')}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Site
            </Button>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sites.map((site) => (
                <Card
                  key={site.id}
                  className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/sites/${site.id}`)}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{site.name}</h3>
                        <p className="text-sm text-gray-500 font-mono">{site.siteCode}</p>
                      </div>
                      <Badge className={site.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {site.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      {site.type && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500">Type:</span>
                          <span className="text-gray-900">{site.type}</span>
                        </div>
                      )}

                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div className="text-gray-900">
                          {[site.city, site.state, site.country].filter(Boolean).join(', ')}
                        </div>
                      </div>

                      {site.assetCount !== undefined && (
                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="text-sm text-gray-500">Assets:</span>
                          <span className="text-sm font-semibold text-gray-900">{site.assetCount}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === 1}
                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === pagination.totalPages}
                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
