'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { FileText, ArrowLeft, Download, Edit, Trash2, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { PageHeader } from '@/components/common';
import { ComplianceStatusBadge, PDFPreview } from '@/components/compliance';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';

interface ComplianceReport {
  reportId: string;
  templateId: string;
  siteId?: string;
  reportData: any;
  status: 'draft' | 'final' | 'submitted';
  format: string;
  watermark: string;
  generatedBy: string;
  generatedAt: string;
  downloadUrl: string;
}

export default function ComplianceReportDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const reportId = params.id as string;
  const { isAuthenticated } = useAuthStore();

  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (reportId) {
      fetchReport();
    }
  }, [isAuthenticated, reportId, router]);

  const fetchReport = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.get(`/compliance/reports/${reportId}`);
      setReport(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch report details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: 'draft' | 'final' | 'submitted') => {
    if (!report) return;

    setIsUpdatingStatus(true);

    try {
      await apiClient.patch(`/compliance/reports/${reportId}/status`, {
        status: newStatus,
      });

      // Refresh report
      await fetchReport();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update report status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDownload = () => {
    if (!report) return;

    const fullUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'}${report.downloadUrl
      }`;
    const link = document.createElement('a');
    link.href = fullUrl;
    link.download = `${report.reportId}.${report.format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Compliance Report">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !report) {
    return (
      <DashboardLayout title="Report Not Found">
        <div className="space-y-6">
          <PageHeader
            title="Report Not Found"
            description="The requested compliance report could not be found"
            actions={
              <Button onClick={() => router.push('/compliance-reports')} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Reports
              </Button>
            }
          />
          <Card className="p-8">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error || 'Report not found'}</p>
              <Button onClick={() => router.push('/compliance-reports')}>
                Go to Reports List
              </Button>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Compliance Report Details">
      <div className="space-y-6">
        <PageHeader
          title={`Compliance Report: ${report.reportId.substring(0, 12)}...`}
          description={`${report.templateId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`}
          actions={
            <div className="flex gap-2">
              <Button onClick={() => router.push('/compliance-reports')} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          }
        />

        {/* Report Metadata */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Left Column: Report Info */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Report Information</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Report ID</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono">{report.reportId}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Template</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {report.templateId
                    .split('-')
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(' ')}
                </dd>
              </div>
              {report.siteId && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Site ID</dt>
                  <dd className="mt-1 text-sm text-gray-900">{report.siteId}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">Format</dt>
                <dd className="mt-1 text-sm text-gray-900 uppercase">{report.format}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Watermark</dt>
                <dd className="mt-1">
                  <span
                    className={
                      report.watermark === 'FINAL'
                        ? 'text-sm font-medium text-green-600'
                        : 'text-sm text-gray-600'
                    }
                  >
                    {report.watermark}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Generated At</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDate(report.generatedAt)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Generated By</dt>
                <dd className="mt-1 text-sm text-gray-900">{report.generatedBy}</dd>
              </div>
            </dl>
          </Card>

          {/* Right Column: Status Management */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Status Management</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500 block mb-2">
                  Current Status
                </label>
                <ComplianceStatusBadge status={report.status} />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 block mb-2">
                  Update Status
                </label>
                <Select
                  value={report.status}
                  onValueChange={(value: 'draft' | 'final' | 'submitted') =>
                    handleStatusChange(value)
                  }
                  disabled={isUpdatingStatus}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                  </SelectContent>
                </Select>
                {isUpdatingStatus && (
                  <p className="text-sm text-gray-500 mt-2">Updating status...</p>
                )}
              </div>

              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Status Guidelines</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>
                    <strong>Draft:</strong> Report is being reviewed or modified
                  </li>
                  <li>
                    <strong>Final:</strong> Report is approved and ready for submission
                  </li>
                  <li>
                    <strong>Submitted:</strong> Report has been submitted to authorities
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </div>

        {/* PDF Preview */}
        <PDFPreview
          reportId={report.reportId}
          downloadUrl={report.downloadUrl}
          format={report.format}
        />

        {/* Report Data (if JSON) */}
        {report.reportData && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Report Data</h3>
            <pre className="bg-gray-50 p-4 rounded-md overflow-x-auto text-sm">
              {JSON.stringify(report.reportData, null, 2)}
            </pre>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
