'use client';

import { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiClient } from '@/lib/api-client';

interface ReportGeneratorProps {
  onReportGenerated?: (reportId: string) => void;
}

export function ReportGenerator({ onReportGenerated }: ReportGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    templateId: '',
    siteId: '',
    startDate: '',
    endDate: '',
    format: 'pdf' as 'pdf' | 'csv' | 'json',
    watermark: 'DRAFT' as 'DRAFT' | 'FINAL',
  });

  const handleGenerate = async () => {
    if (!formData.templateId) {
      setError('Please select a template');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const payload: any = {
        templateId: formData.templateId,
        format: formData.format,
        watermark: formData.watermark,
      };

      if (formData.siteId) payload.siteId = formData.siteId;
      if (formData.startDate) payload.startDate = new Date(formData.startDate).toISOString();
      if (formData.endDate) payload.endDate = new Date(formData.endDate).toISOString();

      const response = await apiClient.post('/compliance/reports', payload);

      if (response.data.report?.reportId) {
        onReportGenerated?.(response.data.report.reportId);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <div>
            <h3 className="text-lg font-semibold">Generate Compliance Report</h3>
            <p className="text-sm text-gray-600">
              Create a new compliance report from a template
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Template Selection */}
          <div className="space-y-2">
            <Label htmlFor="template">Template *</Label>
            <Select
              value={formData.templateId}
              onValueChange={(value) =>
                setFormData({ ...formData, templateId: value })
              }
            >
              <SelectTrigger id="template">
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cea-compliance">CEA Compliance Report</SelectItem>
                <SelectItem value="mnre-quarterly">MNRE Quarterly Report</SelectItem>
                <SelectItem value="asset-maintenance">
                  Asset Maintenance Summary
                </SelectItem>
                <SelectItem value="performance-analysis">
                  Performance Analysis Report
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Site Selection */}
          <div className="space-y-2">
            <Label htmlFor="site">Site (Optional)</Label>
            <Input
              id="site"
              type="text"
              placeholder="Enter Site ID or leave empty for all sites"
              value={formData.siteId}
              onChange={(e) => setFormData({ ...formData, siteId: e.target.value })}
            />
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label htmlFor="start-date">Start Date (Optional)</Label>
            <Input
              id="start-date"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <Label htmlFor="end-date">End Date (Optional)</Label>
            <Input
              id="end-date"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
          </div>

          {/* Format Selection */}
          <div className="space-y-2">
            <Label htmlFor="format">Format</Label>
            <Select
              value={formData.format}
              onValueChange={(value: 'pdf' | 'csv' | 'json') =>
                setFormData({ ...formData, format: value })
              }
            >
              <SelectTrigger id="format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Watermark Selection */}
          <div className="space-y-2">
            <Label htmlFor="watermark">Watermark</Label>
            <Select
              value={formData.watermark}
              onValueChange={(value: 'DRAFT' | 'FINAL') =>
                setFormData({ ...formData, watermark: value })
              }
            >
              <SelectTrigger id="watermark">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="FINAL">Final</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>
        )}

        <div className="flex justify-end">
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Generate Report
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
