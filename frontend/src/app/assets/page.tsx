'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Search, Plus } from 'lucide-react';

interface Asset {
  id: string;
  assetTag: string;
  name: string;
  type: string;
  status: string;
  criticality: string;
  manufacturer: string;
  model: string;
  location: string;
}

export default function AssetsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    criticality: '',
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    fetchAssets();
  }, [isAuthenticated, pagination.page, filters]);

  const fetchAssets = async () => {
    setIsLoading(true);
    try {
      const response = await api.assets.list();
      setAssets(response.data || []);
      setPagination(response.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch (error) {
      console.error('Error fetching assets:', error);
      setAssets([]);
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
              <h1 className="text-2xl font-bold text-gray-900">Assets</h1>
              <p className="text-sm text-gray-600 mt-1">Manage equipment and machinery</p>
            </div>
            <Button onClick={() => alert('Asset creation coming soon')}>
              <Plus className="mr-2 h-4 w-4" />
              New Asset
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
                  placeholder="Search assets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchAssets()}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <select
                className="border rounded-md px-3 py-2 text-sm"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">All Status</option>
                <option value="operational">Operational</option>
                <option value="down">Down</option>
                <option value="maintenance">Maintenance</option>
                <option value="retired">Retired</option>
              </select>

              <select
                className="border rounded-md px-3 py-2 text-sm"
                value={filters.criticality}
                onChange={(e) => setFilters({ ...filters, criticality: e.target.value })}
              >
                <option value="">All Criticality</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Assets Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading assets...</p>
          </div>
        ) : assets.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-gray-600 mb-4">No assets found</p>
            <Button onClick={() => alert('Asset creation coming soon')}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Asset
            </Button>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assets.map((asset) => (
                <Card
                  key={asset.id}
                  className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/assets/${asset.id}`)}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{asset.name}</h3>
                        <p className="text-sm text-gray-500 font-mono">{asset.assetTag}</p>
                      </div>
                      <Badge className={getStatusColor(asset.status)}>{asset.status}</Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Type:</span>
                        <span className="text-gray-900">{asset.type}</span>
                      </div>

                      {asset.manufacturer && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Manufacturer:</span>
                          <span className="text-gray-900 truncate ml-2">{asset.manufacturer}</span>
                        </div>
                      )}

                      {asset.model && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Model:</span>
                          <span className="text-gray-900 truncate ml-2">{asset.model}</span>
                        </div>
                      )}

                      {asset.location && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Location:</span>
                          <span className="text-gray-900 truncate ml-2">{asset.location}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Criticality:</span>
                        <Badge className={getCriticalityColor(asset.criticality)}>
                          {asset.criticality}
                        </Badge>
                      </div>
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
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}{' '}
                  results
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
