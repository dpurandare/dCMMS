'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Plus, Search, Filter, MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import {
  PageHeader,
  EmptyState,
  TableSkeleton,
  ConfirmDialog,
  AssetStatusBadge,
} from '@/components/common';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card } from '@/components/ui/card';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { ProtectedButton } from '@/components/auth/protected';
import { usePermissions } from '@/hooks/use-permissions';

interface Asset {
  id: string;
  name: string;
  assetType: string;
  status: string;
  site: {
    id: string;
    name: string;
  };
  location?: string;
  tags?: string[];
}

export default function AssetsPage() {
  const router = useRouter();
  const { isAuthenticated, logout } = useAuthStore();
  const { can } = usePermissions();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    fetchAssets();
  }, [isAuthenticated, router]);

  const fetchAssets = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.assets.list();
      setAssets(data.data || []);
    } catch (err: any) {
      console.error('Failed to fetch assets:', err);
      setError(err.message || 'Failed to load assets');
      if (err.response?.status === 401) {
        logout();
        router.push('/auth/login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAsset) return;

    try {
      await api.assets.delete(selectedAsset.id);
      setAssets(assets.filter((a) => a.id !== selectedAsset.id));
      setDeleteDialog(false);
      setSelectedAsset(null);
    } catch (err) {
      console.error('Failed to delete asset:', err);
      alert('Failed to delete asset');
    }
  };

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      searchQuery === '' ||
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
    const matchesType = typeFilter === 'all' || asset.assetType === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  if (!isAuthenticated) {
    return null;
  }

  return (
    <DashboardLayout
      title="Assets"
      breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Assets' }]}
      showNewButton={false}
    >
      <PageHeader
        title="Assets"
        description="Manage your asset inventory across all sites"
        breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Assets' }]}
        actions={
          <ProtectedButton
            permissions={['create:assets']}
            onClick={() => router.push('/assets/new')}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Asset
          </ProtectedButton>
        }
      />

      {/* Filters and Search */}
      <Card className="mb-6 p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search assets by name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="operational">Operational</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
              <SelectItem value="decommissioned">Decommissioned</SelectItem>
            </SelectContent>
          </Select>

          {/* Type Filter */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="inverter">Inverter</SelectItem>
              <SelectItem value="transformer">Transformer</SelectItem>
              <SelectItem value="panel">Solar Panel</SelectItem>
              <SelectItem value="battery">Battery</SelectItem>
              <SelectItem value="turbine">Wind Turbine</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear Filters */}
          {(searchQuery || statusFilter !== 'all' || typeFilter !== 'all') && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setTypeFilter('all');
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      </Card>

      {/* Loading State */}
      {isLoading && <TableSkeleton rows={5} columns={5} />}

      {/* Error State */}
      {!isLoading && error && (
        <Card className="p-8 text-center">
          <p className="text-red-600">Error: {error}</p>
          <Button onClick={fetchAssets} variant="outline" className="mt-4">
            Retry
          </Button>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredAssets.length === 0 && assets.length === 0 && (
        <EmptyState
          icon={Package}
          title="No assets found"
          description="Get started by creating your first asset to track equipment and infrastructure."
          action={{
            label: 'Create Asset',
            onClick: () => router.push('/assets/new'),
          }}
        />
      )}

      {/* No Results State */}
      {!isLoading && !error && filteredAssets.length === 0 && assets.length > 0 && (
        <EmptyState
          icon={Filter}
          title="No matching assets"
          description="Try adjusting your search or filter criteria."
        />
      )}

      {/* Assets Table */}
      {!isLoading && !error && filteredAssets.length > 0 && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssets.map((asset) => (
                <TableRow
                  key={asset.id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => router.push(`/assets/${asset.id}`)}
                >
                  <TableCell className="font-mono text-xs">{asset.id}</TableCell>
                  <TableCell className="font-medium">{asset.name}</TableCell>
                  <TableCell className="capitalize">{asset.assetType}</TableCell>
                  <TableCell>
                    <AssetStatusBadge status={asset.status as any} />
                  </TableCell>
                  <TableCell>{asset.site?.name || 'N/A'}</TableCell>
                  <TableCell className="text-slate-600">{asset.location || 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/assets/${asset.id}`);
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        {can('update:assets') && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/assets/${asset.id}/edit`);
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {can('delete:assets') && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAsset(asset);
                                setDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Results Count */}
          <div className="border-t px-6 py-4 text-sm text-slate-600">
            Showing {filteredAssets.length} of {assets.length} assets
          </div>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialog}
        onOpenChange={setDeleteDialog}
        title="Delete Asset"
        description={`Are you sure you want to delete "${selectedAsset?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </DashboardLayout>
  );
}
