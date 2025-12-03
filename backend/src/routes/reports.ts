import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { validatorCompiler, serializerCompiler } from 'fastify-type-provider-zod';
import { db } from '../db';
import { reportDefinitions } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import {
  createReportBuilderService,
  ReportDefinition,
} from '../services/report-builder.service';

// Validation schemas
const reportFilterSchema = z.object({
  field: z.string(),
  operator: z.enum(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'like']),
  value: z.any(),
});

const reportAggregationSchema = z.object({
  field: z.string(),
  type: z.enum(['count', 'sum', 'avg', 'min', 'max']),
  alias: z.string().optional(),
});

const createReportSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  datasource: z.enum(['work_orders', 'assets', 'telemetry', 'alarms']),
  columns: z.array(z.string()).min(1),
  filters: z.array(reportFilterSchema).optional().default([]),
  groupBy: z
    .array(
      z.enum(['day', 'week', 'month', 'site', 'asset_type', 'status', 'type', 'severity', 'priority'])
    )
    .optional(),
  aggregations: z.array(reportAggregationSchema).optional(),
  orderBy: z
    .array(
      z.object({
        field: z.string(),
        direction: z.enum(['asc', 'desc']),
      })
    )
    .optional(),
  limitRows: z.number().min(1).max(10000).optional().default(1000),
  isPublic: z.boolean().optional().default(false),
});

const executeReportSchema = z.object({
  format: z.enum(['json', 'csv']).optional().default('json'),
  limit: z.number().min(1).max(10000).optional(),
});

/**
 * Report Builder Routes
 * Create, manage, and execute custom reports
 */
export default async function reportRoutes(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  const reportBuilder = createReportBuilderService(fastify);

  // ==========================================
  // Report Definition Management
  // ==========================================

  // Create a new report definition
  fastify.post<{
    Body: z.infer<typeof createReportSchema>;
  }>(
    '/reports',
    {
      schema: {
        body: createReportSchema,
        tags: ['Reports'],
        description: 'Create a new custom report definition',
      },
    },
    async (request, reply) => {
      try {
        const tenantId = (request.user as any)?.tenantId;
        const userId = (request.user as any)?.id;

        if (!tenantId || !userId) {
          return reply.status(401).send({
            error: 'Unauthorized',
          });
        }

        const reportData = request.body;

        // Validate that columns exist for datasource
        const availableFields = reportBuilder.getAvailableFields(reportData.datasource);

        for (const column of reportData.columns) {
          if (!availableFields.includes(column)) {
            return reply.status(400).send({
              error: `Invalid column '${column}' for datasource '${reportData.datasource}'`,
              availableFields,
            });
          }
        }

        // Create report definition
        const [report] = await db
          .insert(reportDefinitions)
          .values({
            tenantId,
            createdBy: userId,
            name: reportData.name,
            description: reportData.description,
            datasource: reportData.datasource,
            columns: JSON.stringify(reportData.columns),
            filters: JSON.stringify(reportData.filters || []),
            groupBy: JSON.stringify(reportData.groupBy || []),
            aggregations: JSON.stringify(reportData.aggregations || []),
            orderBy: JSON.stringify(reportData.orderBy || []),
            limitRows: reportData.limitRows || 1000,
            isPublic: reportData.isPublic || false,
          })
          .returning();

        fastify.log.info({ reportId: report.id, name: report.name }, 'Report definition created');

        return reply.status(201).send(report);
      } catch (error) {
        fastify.log.error({ error }, 'Failed to create report definition');
        return reply.status(500).send({
          error: 'Failed to create report definition',
        });
      }
    }
  );

  // List all report definitions for tenant
  fastify.get(
    '/reports',
    {
      schema: {
        tags: ['Reports'],
        description: 'List all report definitions',
      },
    },
    async (request, reply) => {
      try {
        const tenantId = (request.user as any)?.tenantId;
        const userId = (request.user as any)?.id;

        if (!tenantId || !userId) {
          return reply.status(401).send({
            error: 'Unauthorized',
          });
        }

        // Get reports created by user or public reports
        const reports = await db.query.reportDefinitions.findMany({
          where: and(
            eq(reportDefinitions.tenantId, tenantId),
            // Show reports created by user or public reports
            // (createdBy = userId OR isPublic = true)
          ),
          orderBy: (reportDefinitions, { desc }) => [desc(reportDefinitions.createdAt)],
        });

        return reply.send(reports);
      } catch (error) {
        fastify.log.error({ error }, 'Failed to list report definitions');
        return reply.status(500).send({
          error: 'Failed to list report definitions',
        });
      }
    }
  );

  // Get single report definition
  fastify.get<{
    Params: {
      id: string;
    };
  }>(
    '/reports/:id',
    {
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
        tags: ['Reports'],
        description: 'Get report definition by ID',
      },
    },
    async (request, reply) => {
      try {
        const tenantId = (request.user as any)?.tenantId;
        const { id } = request.params;

        if (!tenantId) {
          return reply.status(401).send({
            error: 'Unauthorized',
          });
        }

        const report = await db.query.reportDefinitions.findFirst({
          where: and(eq(reportDefinitions.id, id), eq(reportDefinitions.tenantId, tenantId)),
        });

        if (!report) {
          return reply.status(404).send({
            error: 'Report not found',
          });
        }

        return reply.send(report);
      } catch (error) {
        fastify.log.error({ error }, 'Failed to get report definition');
        return reply.status(500).send({
          error: 'Failed to get report definition',
        });
      }
    }
  );

  // ==========================================
  // Report Execution
  // ==========================================

  // Execute a report
  fastify.post<{
    Params: {
      id: string;
    };
    Body: z.infer<typeof executeReportSchema>;
  }>(
    '/reports/:id/run',
    {
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
        body: executeReportSchema,
        tags: ['Reports'],
        description: 'Execute a report and return results',
      },
    },
    async (request, reply) => {
      try {
        const tenantId = (request.user as any)?.tenantId;
        const { id } = request.params;
        const { format, limit } = request.body;

        if (!tenantId) {
          return reply.status(401).send({
            error: 'Unauthorized',
          });
        }

        // Get report definition
        const report = await db.query.reportDefinitions.findFirst({
          where: and(eq(reportDefinitions.id, id), eq(reportDefinitions.tenantId, tenantId)),
        });

        if (!report) {
          return reply.status(404).send({
            error: 'Report not found',
          });
        }

        // Build report definition from database record
        const definition: ReportDefinition = {
          id: report.id,
          name: report.name,
          description: report.description || undefined,
          datasource: report.datasource as any,
          columns: JSON.parse(report.columns),
          filters: JSON.parse(report.filters || '[]'),
          groupBy: JSON.parse(report.groupBy || '[]'),
          aggregations: JSON.parse(report.aggregations || '[]'),
          orderBy: JSON.parse(report.orderBy || '[]'),
          limit: limit || report.limitRows || 1000,
        };

        fastify.log.info({ reportId: id, name: report.name, format }, 'Executing report');

        // Execute report
        const data = await reportBuilder.executeReport(definition, tenantId, { format, limit });

        // Return data in requested format
        if (format === 'csv') {
          const csv = await reportBuilder.exportToCSV(data);

          reply.header('Content-Type', 'text/csv');
          reply.header('Content-Disposition', `attachment; filename="${report.name}.csv"`);

          return reply.send(csv);
        } else {
          return reply.send({
            reportId: id,
            name: report.name,
            rows: data.length,
            data,
            executedAt: new Date().toISOString(),
          });
        }
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to execute report');
        return reply.status(500).send({
          error: 'Failed to execute report',
          message: error.message,
        });
      }
    }
  );

  // ==========================================
  // Utility Endpoints
  // ==========================================

  // Get available fields for a datasource
  fastify.get<{
    Params: {
      datasource: string;
    };
  }>(
    '/reports/fields/:datasource',
    {
      schema: {
        params: z.object({
          datasource: z.enum(['work_orders', 'assets', 'telemetry', 'alarms']),
        }),
        tags: ['Reports'],
        description: 'Get available fields for a datasource',
      },
    },
    async (request, reply) => {
      try {
        const { datasource } = request.params;

        const fields = reportBuilder.getAvailableFields(datasource as any);

        return reply.send({
          datasource,
          fields,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Failed to get available fields');
        return reply.status(500).send({
          error: 'Failed to get available fields',
        });
      }
    }
  );
}
