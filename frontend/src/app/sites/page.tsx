'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Plus, Search, MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import {
  PageHeader,
  EmptyState,
  TableSkeleton,
  ConfirmDialog,
} from '@/components/common';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import type { Site } from '@/types/api';

export default function SitesPage() {
  const router = useRouter();
  const { isAuthenticated, logout } = useAuthStore();
  const [sites, setSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    fetchSites();
  }, [isAuthenticated, router]);

  const fetchSites = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.sites.list();
      setSites(data.data || []);
    } catch (err: any) {
      console.error('Failed to fetch sites:', err);
      setError(err.message || 'Failed to load sites');
      if (err.response?.status === 401) {
        logout();
        router.push('/auth/login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSite) return;

    try {
      await api.sites.delete(selectedSite.id);
      setSites(sites.filter((s) => s.id !== selectedSite.id));
      setDeleteDialog(false);
      setSelectedSite(null);
    } catch (err) {
      console.error('Failed to delete site:', err);
      alert('Failed to delete site');
    }
  };

  const filteredSites = sites.filter((site) => {
    const matchesSearch =
      searchQuery === '' ||
      site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (site.location || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  if (!isAuthenticated) {
    return null;
  }

  return (
    <DashboardLayout
      title="Sites"
      breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Sites' }]}
      showNewButton={false}
    >
      <PageHeader
        title="Sites"
        description="Manage your facility locations and sites"
        breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Sites' }]}
        actions={
          <Button onClick={() => router.push('/sites/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Site
          </Button>
        }
      />

      {/* Search */}
      <Card className="mb-6 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search sites by name or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Loading State */}
      {isLoading && <TableSkeleton rows={5} columns={5} />}

      {/* Error State */}
      {!isLoading && error && (
        <Card className="p-8 text-center">
          <p className="text-red-600">Error: {error}</p>
          <Button onClick={fetchSites} variant="outline" className="mt-4">
            Retry
          </Button>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredSites.length === 0 && sites.length === 0 && (
        <EmptyState
          icon={MapPin}
          title="No sites found"
          description="Get started by creating your first site to organize your assets and operations."
          action={{
            label: 'Create Site',
            onClick: () => router.push('/sites/new'),
          }}
        />
      )}

      {/* No Results State */}
      {!isLoading && !error && filteredSites.length === 0 && sites.length > 0 && (
        <EmptyState
          icon={Search}
          title="No matching sites"
          description="Try adjusting your search criteria."
        />
      )}

      {/* Sites Table */}
      {!isLoading && !error && filteredSites.length > 0 && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Site Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Timezone</TableHead>
                <TableHead>Assets</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSites.map((site) => (
                <TableRow
                  key={site.id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => router.push(`/sites/${site.id}`)}
                >
                  <TableCell className="font-medium">{site.name}</TableCell>
                  <TableCell>{site.location}</TableCell>
                  <TableCell>{site.capacity ? `${site.capacity} MW` : 'N/A'}</TableCell>
                  <TableCell>{site.timezone || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{site.assetCount || 0} assets</Badge>
                  </TableCell>
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
                            router.push(`/sites/${site.id}`);
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/sites/${site.id}/edit`);
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSite(site);
                            setDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Results Count */}
          <div className="border-t px-6 py-4 text-sm text-slate-600">
            Showing {filteredSites.length} of {sites.length} sites
          </div>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialog}
        onOpenChange={setDeleteDialog}
        title="Delete Site"
        description={`Are you sure you want to delete "${selectedSite?.name}"? This action cannot be undone and will affect all associated assets.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </DashboardLayout>
  );
}
