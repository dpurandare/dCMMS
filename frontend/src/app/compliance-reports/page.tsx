'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Plus, Search, Filter, Download, Eye, Trash2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import {
  PageHeader,
  EmptyState,
  TableSkeleton,
  ConfirmDialog,
} from '@/components/common';
import { ComplianceStatusBadge, ReportGenerator } from '@/components/compliance';
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
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { MoreHorizontal } from 'lucide-react';
import { API_CONFIG } from '@/config';
import { PermissionGuard } from '@/components/auth/PermissionGuard';

interface ComplianceReport {
  reportId: string;
  templateId: string;
  siteId?: string;
  status: 'draft' | 'final' | 'submitted';
  format: string;
  watermark: string;
  generatedBy: string;
  generatedAt: string;
  downloadUrl: string;
}

export default function ComplianceReportsPage() {
  return (
    <PermissionGuard permission="compliance.view" showAccessDenied>
      <ComplianceReportsContent />
    </PermissionGuard>
  );
}

function ComplianceReportsContent() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [reports, setReports] = useState<ComplianceReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [templateFilter, setTemplateFilter] = useState<string>('all');
  const [showGenerator, setShowGenerator] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ComplianceReport | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    fetchReports();
  }, [isAuthenticated, router]);

  const fetchReports = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (templateFilter !== 'all') params.templateId = templateFilter;

      const response = await apiClient.get('/compliance/reports', { params });
      setReports(response.data.reports || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch compliance reports');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReportGenerated = (reportId: string) => {
    setShowGenerator(false);
    fetchReports();
    router.push(`/compliance-reports/${reportId}`);
  };

  const handleDownload = (report: ComplianceReport) => {
    const fullUrl = `${API_CONFIG.baseURL}${report.downloadUrl}`;
    const link = document.createElement('a');
    link.href = fullUrl;
    link.download = `${report.reportId}.${report.format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async () => {
    if (!selectedReport) return;

    try {
      // Note: Delete endpoint not in current backend - would need to be added
      // await apiClient.delete(`/compliance/reports/${selectedReport.reportId}`);
      setDeleteDialog(false);
      setSelectedReport(null);
      fetchReports();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete report');
    }
  };

  // Filter reports based on search
  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      searchQuery === '' ||
      report.reportId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.templateId.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <DashboardLayout title="Compliance Reports">
      <div className="space-y-6">
        <PageHeader
          title="Compliance Reports"
          description="Generate and manage compliance reports for regulatory requirements"
          actions={
            <Button onClick={() => setShowGenerator(!showGenerator)}>
              <Plus className="h-4 w-4 mr-2" />
              {showGenerator ? 'Hide Generator' : 'Generate Report'}
            </Button>
          }
        />

        {/* Report Generator (collapsible) */}
        {showGenerator && (
          <ReportGenerator onReportGenerated={handleReportGenerated} />
        )}

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by Report ID or Template..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={(value) => {
                setStatusFilter(value);
                fetchReports();
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Template Filter */}
            <div className="w-full md:w-48">
              <Select value={templateFilter} onValueChange={(value) => {
                setTemplateFilter(value);
                fetchReports();
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Templates</SelectItem>
                  <SelectItem value="cea-compliance">CEA Compliance</SelectItem>
                  <SelectItem value="mnre-quarterly">MNRE Quarterly</SelectItem>
                  <SelectItem value="asset-maintenance">Asset Maintenance</SelectItem>
                  <SelectItem value="performance-analysis">
                    Performance Analysis
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Reports Table */}
        <Card>
          {isLoading ? (
            <TableSkeleton columns={6} rows={5} />
          ) : error ? (
            <div className="p-8">
              <div className="text-center text-red-600">{error}</div>
              <div className="mt-4 text-center">
                <Button onClick={fetchReports} variant="outline">
                  Try Again
                </Button>
              </div>
            </div>
          ) : filteredReports.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No compliance reports found"
              description={
                searchQuery
                  ? 'No reports match your search criteria'
                  : 'Generate your first compliance report to get started'
              }
              action={
                !showGenerator
                  ? {
                    label: 'Generate Report',
                    onClick: () => setShowGenerator(true),
                  }
                  : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report ID</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Watermark</TableHead>
                    <TableHead>Generated At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => (
                    <TableRow key={report.reportId}>
                      <TableCell className="font-medium">
                        {report.reportId.substring(0, 8)}...
                      </TableCell>
                      <TableCell>
                        {report.templateId
                          .split('-')
                          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                          .join(' ')}
                      </TableCell>
                      <TableCell>
                        <ComplianceStatusBadge status={report.status} />
                      </TableCell>
                      <TableCell className="uppercase">{report.format}</TableCell>
                      <TableCell>
                        <span
                          className={
                            report.watermark === 'FINAL'
                              ? 'text-green-600 font-medium'
                              : 'text-gray-500'
                          }
                        >
                          {report.watermark}
                        </span>
                      </TableCell>
                      <TableCell>{formatDate(report.generatedAt)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(`/compliance-reports/${report.reportId}`)
                              }
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownload(report)}>
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => {
                                setSelectedReport(report);
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
            </div>
          )}
        </Card>

        {/* Result Count */}
        {!isLoading && !error && filteredReports.length > 0 && (
          <div className="text-sm text-gray-600 text-center">
            Showing {filteredReports.length} of {reports.length} reports
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialog}
        onOpenChange={setDeleteDialog}
        onConfirm={handleDelete}
        title="Delete Compliance Report"
        description={`Are you sure you want to delete report ${selectedReport?.reportId}? This action cannot be undone.`}
      />
    </DashboardLayout>
  );
}
