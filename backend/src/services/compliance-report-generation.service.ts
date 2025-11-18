import { FastifyInstance } from 'fastify';
import { db } from '../db';
import { complianceGeneratedReports } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { createComplianceTemplateService } from './compliance-template.service';
import PDFDocument from 'pdfkit';
import { createWriteStream, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

export interface GenerateReportRequest {
  templateId: string;
  siteId?: string;
  startDate?: Date;
  endDate?: Date;
  manualData?: Record<string, any>;
  watermark?: 'DRAFT' | 'FINAL';
  format?: 'pdf' | 'csv' | 'json';
}

export interface GeneratedReport {
  id: string;
  reportId: string;
  tenantId: string;
  templateId: string;
  siteId?: string;
  reportData: any;
  status: 'draft' | 'final' | 'submitted';
  format: string;
  filePath: string;
  watermark: string;
  generatedBy: string;
  generatedAt: Date;
}

/**
 * Compliance Report Generation Service
 * Handles PDF generation, storage, and retrieval of compliance reports
 */
export class ComplianceReportGenerationService {
  private fastify: FastifyInstance;
  private templateService: ReturnType<typeof createComplianceTemplateService>;
  private storageBasePath: string;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    this.templateService = createComplianceTemplateService(fastify);

    // Determine storage path (S3 for production, local for dev)
    this.storageBasePath =
      process.env.COMPLIANCE_REPORTS_PATH || '/tmp/dcmms/compliance-reports';

    // Ensure storage directory exists
    if (!existsSync(this.storageBasePath)) {
      mkdirSync(this.storageBasePath, { recursive: true });
    }
  }

  /**
   * Generate a compliance report
   */
  async generateReport(
    request: GenerateReportRequest,
    tenantId: string,
    userId: string
  ): Promise<GeneratedReport> {
    this.fastify.log.info(
      { templateId: request.templateId, format: request.format },
      'Generating compliance report'
    );

    try {
      // Get template
      const template = await this.templateService.getTemplate(request.templateId);

      if (!template) {
        throw new Error(`Template not found: ${request.templateId}`);
      }

      // Auto-populate data
      const autoData = await this.templateService.autoPopulateData(
        request.templateId,
        tenantId,
        request.siteId,
        request.startDate,
        request.endDate
      );

      // Merge with manual data
      const reportData = {
        ...autoData,
        ...request.manualData,
      };

      // Validate
      const validation = this.templateService.validateReportData(template, reportData);

      if (!validation.valid) {
        throw new Error(`Report validation failed: ${validation.errors.join(', ')}`);
      }

      // Generate unique report ID
      const reportId = `RPT-${Date.now()}-${randomUUID().substring(0, 8).toUpperCase()}`;

      // Generate file based on format
      const format = request.format || 'pdf';
      const watermark = request.watermark || 'DRAFT';
      let filePath: string;

      if (format === 'pdf') {
        filePath = await this.generatePDF(template, reportData, reportId, watermark);
      } else if (format === 'csv') {
        filePath = await this.generateCSV(template, reportData, reportId);
      } else {
        filePath = await this.generateJSON(template, reportData, reportId);
      }

      // Save to database
      const [dbReport] = await db
        .insert(complianceGeneratedReports)
        .values({
          tenantId,
          reportId,
          templateId: template.templateId,
          siteId: request.siteId || null,
          reportData: JSON.stringify(reportData),
          status: watermark === 'FINAL' ? 'final' : 'draft',
          format,
          filePath,
          watermark,
          generatedBy: userId,
        })
        .returning();

      this.fastify.log.info({ reportId, format }, 'Compliance report generated');

      return this.mapReport(dbReport);
    } catch (error) {
      this.fastify.log.error({ error }, 'Failed to generate compliance report');
      throw error;
    }
  }

  /**
   * Generate PDF report
   */
  private async generatePDF(
    template: any,
    reportData: any,
    reportId: string,
    watermark: string
  ): Promise<string> {
    const fileName = `${reportId}.pdf`;
    const filePath = join(this.storageBasePath, fileName);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
          info: {
            Title: template.name,
            Author: 'dCMMS',
            Subject: `${template.complianceStandard} - ${template.reportType}`,
          },
        });

        const writeStream = createWriteStream(filePath);
        doc.pipe(writeStream);

        // Add watermark
        if (watermark === 'DRAFT') {
          this.addWatermark(doc, watermark);
        }

        // Header
        this.addPDFHeader(doc, template, reportId, watermark);

        // Content
        this.addPDFContent(doc, template, reportData);

        // Footer
        this.addPDFFooter(doc);

        doc.end();

        writeStream.on('finish', () => {
          resolve(filePath);
        });

        writeStream.on('error', (error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Add watermark to PDF
   */
  private addWatermark(doc: PDFKit.PDFDocument, text: string): void {
    const width = doc.page.width;
    const height = doc.page.height;

    doc.save();
    doc
      .fontSize(80)
      .fillColor('#ff0000', 0.1)
      .rotate(-45, { origin: [width / 2, height / 2] })
      .text(text, 0, height / 2, {
        align: 'center',
        width: width,
      });
    doc.restore();
  }

  /**
   * Add header to PDF
   */
  private addPDFHeader(
    doc: PDFKit.PDFDocument,
    template: any,
    reportId: string,
    watermark: string
  ): void {
    // Title
    doc
      .fontSize(20)
      .fillColor('#000000')
      .text(template.name, { align: 'center' });

    doc.moveDown(0.5);

    // Subtitle
    doc
      .fontSize(12)
      .fillColor('#666666')
      .text(`${template.complianceStandard} - Version ${template.version}`, {
        align: 'center',
      });

    doc.moveDown(1);

    // Report metadata
    doc
      .fontSize(10)
      .fillColor('#333333')
      .text(`Report ID: ${reportId}`, { continued: true })
      .text(`    Status: ${watermark}`, { align: 'right' });

    doc
      .text(`Generated: ${new Date().toISOString()}`, { continued: true })
      .text(`    Type: ${template.reportType}`, { align: 'right' });

    doc.moveDown(1);

    // Divider
    doc
      .strokeColor('#cccccc')
      .lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(doc.page.width - 50, doc.y)
      .stroke();

    doc.moveDown(1);
  }

  /**
   * Add content to PDF
   */
  private addPDFContent(doc: PDFKit.PDFDocument, template: any, reportData: any): void {
    // Required fields section
    doc.fontSize(14).fillColor('#000000').text('Required Fields', { underline: true });
    doc.moveDown(0.5);

    for (const field of template.requiredFields) {
      const value = reportData[field.name] || 'N/A';
      const displayValue = this.formatFieldValue(value);

      doc
        .fontSize(10)
        .fillColor('#333333')
        .text(`${field.label}:`, { continued: true })
        .fillColor('#000000')
        .text(` ${displayValue}`);

      doc.moveDown(0.3);
    }

    doc.moveDown(1);

    // Optional fields section (if any have values)
    const optionalFieldsWithValues = template.optionalFields.filter(
      (field: any) => reportData[field.name]
    );

    if (optionalFieldsWithValues.length > 0) {
      doc.fontSize(14).fillColor('#000000').text('Additional Information', { underline: true });
      doc.moveDown(0.5);

      for (const field of optionalFieldsWithValues) {
        const value = reportData[field.name];
        const displayValue = this.formatFieldValue(value);

        doc
          .fontSize(10)
          .fillColor('#333333')
          .text(`${field.label}:`, { continued: true })
          .fillColor('#000000')
          .text(` ${displayValue}`);

        doc.moveDown(0.3);
      }

      doc.moveDown(1);
    }

    // Handle array data (tables)
    for (const [key, value] of Object.entries(reportData)) {
      if (Array.isArray(value) && value.length > 0) {
        doc.fontSize(14).fillColor('#000000').text(this.formatFieldName(key), { underline: true });
        doc.moveDown(0.5);

        // Add table
        this.addPDFTable(doc, value);
        doc.moveDown(1);
      }
    }
  }

  /**
   * Add table to PDF
   */
  private addPDFTable(doc: PDFKit.PDFDocument, data: any[]): void {
    if (data.length === 0) return;

    // Get column headers from first row
    const headers = Object.keys(data[0]);
    const columnWidth = (doc.page.width - 100) / headers.length;

    // Draw header row
    doc.fontSize(9).fillColor('#ffffff');
    let x = 50;
    const headerY = doc.y;

    doc.rect(50, headerY, doc.page.width - 100, 20).fill('#4a5568');

    headers.forEach((header) => {
      doc.text(this.formatFieldName(header), x + 5, headerY + 5, {
        width: columnWidth - 10,
        align: 'left',
      });
      x += columnWidth;
    });

    doc.moveDown(1.5);

    // Draw data rows
    data.forEach((row, index) => {
      x = 50;
      const rowY = doc.y;

      // Alternate row colors
      if (index % 2 === 0) {
        doc.rect(50, rowY, doc.page.width - 100, 18).fill('#f7fafc');
      }

      doc.fontSize(8).fillColor('#000000');

      headers.forEach((header) => {
        const value = this.formatFieldValue(row[header]);
        doc.text(value, x + 5, rowY + 4, {
          width: columnWidth - 10,
          align: 'left',
        });
        x += columnWidth;
      });

      doc.moveDown(1.2);
    });
  }

  /**
   * Add footer to PDF
   */
  private addPDFFooter(doc: PDFKit.PDFDocument): void {
    const pageCount = doc.bufferedPageRange().count;

    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);

      const footerY = doc.page.height - 30;

      doc
        .fontSize(8)
        .fillColor('#666666')
        .text(`Page ${i + 1} of ${pageCount}`, 50, footerY, {
          align: 'center',
        });

      doc.text('Generated by dCMMS', 50, footerY, {
        align: 'right',
      });
    }
  }

  /**
   * Generate CSV report
   */
  private async generateCSV(
    template: any,
    reportData: any,
    reportId: string
  ): Promise<string> {
    const fileName = `${reportId}.csv`;
    const filePath = join(this.storageBasePath, fileName);

    // Simple CSV generation
    const lines: string[] = [];

    // Header
    lines.push(`"Report","${template.name}"`);
    lines.push(`"Standard","${template.complianceStandard}"`);
    lines.push(`"Generated","${new Date().toISOString()}"`);
    lines.push('');

    // Fields
    lines.push('"Field","Value"');

    for (const field of [...template.requiredFields, ...template.optionalFields]) {
      const value = reportData[field.name] || '';
      const displayValue = this.formatFieldValue(value);
      lines.push(`"${field.label}","${displayValue}"`);
    }

    const csvContent = lines.join('\n');

    return new Promise((resolve, reject) => {
      const writeStream = createWriteStream(filePath);
      writeStream.write(csvContent);
      writeStream.end();

      writeStream.on('finish', () => resolve(filePath));
      writeStream.on('error', reject);
    });
  }

  /**
   * Generate JSON report
   */
  private async generateJSON(
    template: any,
    reportData: any,
    reportId: string
  ): Promise<string> {
    const fileName = `${reportId}.json`;
    const filePath = join(this.storageBasePath, fileName);

    const jsonReport = {
      reportId,
      template: {
        name: template.name,
        complianceStandard: template.complianceStandard,
        version: template.version,
        reportType: template.reportType,
      },
      data: reportData,
      generatedAt: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const writeStream = createWriteStream(filePath);
      writeStream.write(JSON.stringify(jsonReport, null, 2));
      writeStream.end();

      writeStream.on('finish', () => resolve(filePath));
      writeStream.on('error', reject);
    });
  }

  /**
   * List generated reports
   */
  async listReports(tenantId: string, filters?: {
    templateId?: string;
    status?: string;
  }): Promise<GeneratedReport[]> {
    const whereConditions = [eq(complianceGeneratedReports.tenantId, tenantId)];

    if (filters?.templateId) {
      whereConditions.push(eq(complianceGeneratedReports.templateId, filters.templateId));
    }

    if (filters?.status) {
      whereConditions.push(eq(complianceGeneratedReports.status, filters.status as any));
    }

    const reports = await db.query.complianceGeneratedReports.findMany({
      where: and(...whereConditions),
      orderBy: [desc(complianceGeneratedReports.generatedAt)],
    });

    return reports.map((r) => this.mapReport(r));
  }

  /**
   * Get single report
   */
  async getReport(reportId: string, tenantId: string): Promise<GeneratedReport | null> {
    const report = await db.query.complianceGeneratedReports.findFirst({
      where: and(
        eq(complianceGeneratedReports.reportId, reportId),
        eq(complianceGeneratedReports.tenantId, tenantId)
      ),
    });

    if (!report) {
      return null;
    }

    return this.mapReport(report);
  }

  /**
   * Update report status
   */
  async updateReportStatus(
    reportId: string,
    tenantId: string,
    status: 'draft' | 'final' | 'submitted'
  ): Promise<GeneratedReport | null> {
    const [updated] = await db
      .update(complianceGeneratedReports)
      .set({ status })
      .where(
        and(
          eq(complianceGeneratedReports.reportId, reportId),
          eq(complianceGeneratedReports.tenantId, tenantId)
        )
      )
      .returning();

    if (!updated) {
      return null;
    }

    return this.mapReport(updated);
  }

  /**
   * Helper: Format field value for display
   */
  private formatFieldValue(value: any): string {
    if (value === null || value === undefined) return 'N/A';
    if (Array.isArray(value)) return `${value.length} items`;
    if (typeof value === 'object') return JSON.stringify(value);
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  }

  /**
   * Helper: Format field name
   */
  private formatFieldName(name: string): string {
    return name
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }

  /**
   * Map database report to service report
   */
  private mapReport(dbReport: any): GeneratedReport {
    return {
      id: dbReport.id,
      reportId: dbReport.reportId,
      tenantId: dbReport.tenantId,
      templateId: dbReport.templateId,
      siteId: dbReport.siteId,
      reportData: JSON.parse(dbReport.reportData || '{}'),
      status: dbReport.status,
      format: dbReport.format,
      filePath: dbReport.filePath,
      watermark: dbReport.watermark,
      generatedBy: dbReport.generatedBy,
      generatedAt: dbReport.generatedAt,
    };
  }
}

export function createComplianceReportGenerationService(
  fastify: FastifyInstance
): ComplianceReportGenerationService {
  return new ComplianceReportGenerationService(fastify);
}
