'use client';

import { Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface PDFPreviewProps {
  reportId: string;
  downloadUrl: string;
  format: string;
}

export function PDFPreview({ reportId, downloadUrl, format }: PDFPreviewProps) {
  const fullUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'}${downloadUrl}`;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fullUrl;
    link.download = `${reportId}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Report Preview</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(fullUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </Button>
          </div>
        </div>

        {format === 'pdf' && (
          <div className="border rounded-md overflow-hidden bg-gray-50">
            <iframe
              src={`${fullUrl}#view=FitH`}
              className="w-full h-[600px]"
              title="PDF Preview"
            />
          </div>
        )}

        {format === 'csv' && (
          <div className="border rounded-md p-4 bg-gray-50">
            <p className="text-sm text-gray-600">
              CSV preview not available. Please download the file to view the contents.
            </p>
          </div>
        )}

        {format === 'json' && (
          <div className="border rounded-md p-4 bg-gray-50">
            <p className="text-sm text-gray-600">
              JSON preview not available. Please download the file to view the contents.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
