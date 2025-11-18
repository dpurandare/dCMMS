import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createComplianceReportGenerationService } from '../services/compliance-report-generation.service';
import { createReadStream, existsSync } from 'fs';

// Validation schemas
const generateReportSchema = z.object({
  templateId: z.string().min(1),
  siteId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  manualData: z.record(z.any()).optional(),
  watermark: z.enum(['DRAFT', 'FINAL']).optional().default('DRAFT'),
  format: z.enum(['pdf', 'csv', 'json']).optional().default('pdf'),
});

const updateStatusSchema = z.object({
  status: z.enum(['draft', 'final', 'submitted']),
});

/**
 * Compliance Report Generation Routes
 * Generate, list, and download compliance reports
 */
export default async function complianceReportRoutes(fastify: FastifyInstance) {
  const reportService = createComplianceReportGenerationService(fastify);

  // ==========================================
  // Report Generation
  // ==========================================

  // Generate a new compliance report
  fastify.post<{
    Body: z.infer<typeof generateReportSchema>;
  }>(
    '/compliance/reports',
    {
      schema: {
        body: generateReportSchema,
        tags: ['Compliance'],
        description: 'Generate a new compliance report (PDF, CSV, or JSON)',
      },
    },
    async (request, reply) => {
      try {
        const tenantId = request.user?.tenantId;
        const userId = request.user?.id;

        if (!tenantId || !userId) {
          return reply.status(401).send({
            error: 'Unauthorized',
          });
        }

        const reportRequest = {
          ...request.body,
          startDate: request.body.startDate ? new Date(request.body.startDate) : undefined,
          endDate: request.body.endDate ? new Date(request.body.endDate) : undefined,
        };

        const report = await reportService.generateReport(reportRequest, tenantId, userId);

        fastify.log.info({ reportId: report.reportId }, 'Compliance report generated');

        return reply.status(201).send({
          message: 'Report generated successfully',
          report: {
            reportId: report.reportId,
            templateId: report.templateId,
            status: report.status,
            format: report.format,
            watermark: report.watermark,
            generatedAt: report.generatedAt,
            downloadUrl: `/api/v1/compliance/reports/${report.reportId}/download`,
          },
        });
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to generate compliance report');
        return reply.status(500).send({
          error: 'Failed to generate compliance report',
          message: error.message,
        });
      }
    }
  );

  // ==========================================
  // Report Listing
  // ==========================================

  // List all compliance reports
  fastify.get<{
    Querystring: {
      templateId?: string;
      status?: string;
    };
  }>(
    '/compliance/reports',
    {
      schema: {
        querystring: z.object({
          templateId: z.string().optional(),
          status: z.enum(['draft', 'final', 'submitted']).optional(),
        }),
        tags: ['Compliance'],
        description: 'List all generated compliance reports',
      },
    },
    async (request, reply) => {
      try {
        const tenantId = request.user?.tenantId;

        if (!tenantId) {
          return reply.status(401).send({
            error: 'Unauthorized',
          });
        }

        const { templateId, status } = request.query;

        const reports = await reportService.listReports(tenantId, {
          templateId,
          status,
        });

        return reply.send({
          count: reports.length,
          reports: reports.map((r) => ({
            reportId: r.reportId,
            templateId: r.templateId,
            siteId: r.siteId,
            status: r.status,
            format: r.format,
            watermark: r.watermark,
            generatedBy: r.generatedBy,
            generatedAt: r.generatedAt,
            downloadUrl: `/api/v1/compliance/reports/${r.reportId}/download`,
          })),
        });
      } catch (error) {
        fastify.log.error({ error }, 'Failed to list compliance reports');
        return reply.status(500).send({
          error: 'Failed to list compliance reports',
        });
      }
    }
  );

  // Get single compliance report
  fastify.get<{
    Params: {
      reportId: string;
    };
  }>(
    '/compliance/reports/:reportId',
    {
      schema: {
        params: z.object({
          reportId: z.string(),
        }),
        tags: ['Compliance'],
        description: 'Get compliance report details by ID',
      },
    },
    async (request, reply) => {
      try {
        const tenantId = request.user?.tenantId;

        if (!tenantId) {
          return reply.status(401).send({
            error: 'Unauthorized',
          });
        }

        const { reportId } = request.params;

        const report = await reportService.getReport(reportId, tenantId);

        if (!report) {
          return reply.status(404).send({
            error: 'Report not found',
          });
        }

        return reply.send({
          reportId: report.reportId,
          templateId: report.templateId,
          siteId: report.siteId,
          reportData: report.reportData,
          status: report.status,
          format: report.format,
          watermark: report.watermark,
          generatedBy: report.generatedBy,
          generatedAt: report.generatedAt,
          downloadUrl: `/api/v1/compliance/reports/${report.reportId}/download`,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Failed to get compliance report');
        return reply.status(500).send({
          error: 'Failed to get compliance report',
        });
      }
    }
  );

  // ==========================================
  // Report Download
  // ==========================================

  // Download compliance report file
  fastify.get<{
    Params: {
      reportId: string;
    };
  }>(
    '/compliance/reports/:reportId/download',
    {
      schema: {
        params: z.object({
          reportId: z.string(),
        }),
        tags: ['Compliance'],
        description: 'Download compliance report file',
      },
    },
    async (request, reply) => {
      try {
        const tenantId = request.user?.tenantId;

        if (!tenantId) {
          return reply.status(401).send({
            error: 'Unauthorized',
          });
        }

        const { reportId } = request.params;

        // Get report
        const report = await reportService.getReport(reportId, tenantId);

        if (!report) {
          return reply.status(404).send({
            error: 'Report not found',
          });
        }

        // Check if file exists
        if (!existsSync(report.filePath)) {
          fastify.log.error({ reportId, filePath: report.filePath }, 'Report file not found');
          return reply.status(404).send({
            error: 'Report file not found',
          });
        }

        // Set content type based on format
        const contentTypes: Record<string, string> = {
          pdf: 'application/pdf',
          csv: 'text/csv',
          json: 'application/json',
        };

        const contentType = contentTypes[report.format] || 'application/octet-stream';
        const fileName = `${reportId}.${report.format}`;

        reply.header('Content-Type', contentType);
        reply.header('Content-Disposition', `attachment; filename="${fileName}"`);

        const fileStream = createReadStream(report.filePath);

        return reply.send(fileStream);
      } catch (error) {
        fastify.log.error({ error }, 'Failed to download compliance report');
        return reply.status(500).send({
          error: 'Failed to download compliance report',
        });
      }
    }
  );

  // ==========================================
  // Report Status Management
  // ==========================================

  // Update report status
  fastify.patch<{
    Params: {
      reportId: string;
    };
    Body: z.infer<typeof updateStatusSchema>;
  }>(
    '/compliance/reports/:reportId/status',
    {
      schema: {
        params: z.object({
          reportId: z.string(),
        }),
        body: updateStatusSchema,
        tags: ['Compliance'],
        description: 'Update compliance report status (draft, final, submitted)',
      },
    },
    async (request, reply) => {
      try {
        const tenantId = request.user?.tenantId;

        if (!tenantId) {
          return reply.status(401).send({
            error: 'Unauthorized',
          });
        }

        const { reportId } = request.params;
        const { status } = request.body;

        const updated = await reportService.updateReportStatus(reportId, tenantId, status);

        if (!updated) {
          return reply.status(404).send({
            error: 'Report not found',
          });
        }

        fastify.log.info({ reportId, status }, 'Report status updated');

        return reply.send({
          message: 'Report status updated successfully',
          report: {
            reportId: updated.reportId,
            status: updated.status,
            watermark: updated.watermark,
          },
        });
      } catch (error) {
        fastify.log.error({ error }, 'Failed to update report status');
        return reply.status(500).send({
          error: 'Failed to update report status',
        });
      }
    }
  );
}
