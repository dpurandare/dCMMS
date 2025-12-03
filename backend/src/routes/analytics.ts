import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { validatorCompiler, serializerCompiler } from 'fastify-type-provider-zod';
import { createKPICalculationService } from '../services/kpi-calculation.service';

// Validation schemas
const kpiQuerySchema = z.object({
  site_id: z.string().uuid().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

/**
 * Analytics Routes
 * Public endpoints for analytics dashboards and KPIs
 */
export default async function analyticsRoutes(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  const kpiService = createKPICalculationService(fastify);

  // Get KPIs for dashboard
  fastify.get<{
    Querystring: z.infer<typeof kpiQuerySchema>;
  }>(
    '/analytics/kpis',
    {
      schema: {
        querystring: kpiQuerySchema,
        tags: ['Analytics'],
        description: 'Get KPIs for analytics dashboard',
        response: {
          200: {
            type: 'object',
            properties: {
              mttr: { type: 'number' },
              mtbf: { type: 'number' },
              completionRate: { type: 'number' },
              availability: { type: 'number' },
              pmCompliance: { type: 'number' },
              firstTimeFixRate: { type: 'number' },
              totalWorkOrders: { type: 'number' },
              completedWorkOrders: { type: 'number' },
              overdueWorkOrders: { type: 'number' },
              criticalAlarms: { type: 'number' },
              totalDowntimeHours: { type: 'number' },
              totalMaintenanceCost: { type: 'number' },
              calculatedAt: { type: 'string', format: 'date-time' },
              period: {
                type: 'object',
                properties: {
                  startDate: { type: 'string', format: 'date-time' },
                  endDate: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // Get tenant ID from authenticated user
        const tenantId = (request.user as any)?.tenantId;

        if (!tenantId) {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: 'Tenant ID not found in user session',
          });
        }

        const { site_id, start_date, end_date } = request.query;

        // Parse dates if provided
        const startDate = start_date ? new Date(start_date) : undefined;
        const endDate = end_date ? new Date(end_date) : undefined;

        // Calculate KPIs
        const kpis = await kpiService.calculateKPIs({
          tenantId,
          siteId: site_id,
          startDate,
          endDate,
        });

        return reply.send(kpis);
      } catch (error) {
        fastify.log.error({ error }, 'Failed to get KPIs');
        return reply.status(500).send({
          error: 'Failed to calculate KPIs',
        });
      }
    }
  );

  // Get KPI trends (last 7 days)
  fastify.get<{
    Querystring: {
      site_id?: string;
      metric: 'mttr' | 'mtbf' | 'completion_rate' | 'availability' | 'pm_compliance';
      days?: number;
    };
  }>(
    '/analytics/kpis/trends',
    {
      schema: {
        querystring: z.object({
          site_id: z.string().uuid().optional(),
          metric: z.enum(['mttr', 'mtbf', 'completion_rate', 'availability', 'pm_compliance']),
          days: z.number().optional().default(7),
        }),
        tags: ['Analytics'],
        description: 'Get KPI trends over time',
      },
    },
    async (request, reply) => {
      try {
        const tenantId = (request.user as any)?.tenantId;

        if (!tenantId) {
          return reply.status(401).send({
            error: 'Unauthorized',
          });
        }

        const { site_id, metric, days } = request.query;

        // Calculate KPIs for each day
        const trends = [];
        const endDate = new Date();

        for (let i = 0; i < (days || 7); i++) {
          const end = new Date(endDate);
          end.setDate(end.getDate() - i);

          const start = new Date(end);
          start.setHours(0, 0, 0, 0);

          const dayEnd = new Date(end);
          dayEnd.setHours(23, 59, 59, 999);

          const kpis = await kpiService.calculateKPIs({
            tenantId,
            siteId: site_id,
            startDate: start,
            endDate: dayEnd,
          });

          trends.push({
            date: start.toISOString().split('T')[0],
            value: kpis[metric === 'completion_rate' ? 'completionRate' : metric === 'pm_compliance' ? 'pmCompliance' : metric],
          });
        }

        // Reverse to get chronological order
        trends.reverse();

        return reply.send({
          metric,
          trends,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Failed to get KPI trends');
        return reply.status(500).send({
          error: 'Failed to get KPI trends',
        });
      }
    }
  );

  // Invalidate KPI cache (admin only)
  fastify.post<{
    Body: {
      site_id?: string;
    };
  }>(
    '/admin/analytics/kpis/invalidate-cache',
    {
      schema: {
        body: z.object({
          site_id: z.string().uuid().optional(),
        }),
        tags: ['Admin', 'Analytics'],
        description: 'Invalidate KPI cache for tenant/site',
      },
    },
    async (request, reply) => {
      try {
        const tenantId = (request.user as any)?.tenantId;

        if (!tenantId) {
          return reply.status(401).send({
            error: 'Unauthorized',
          });
        }

        const { site_id } = request.body;

        await kpiService.invalidateCache(tenantId, site_id);

        return reply.send({
          success: true,
          message: 'KPI cache invalidated successfully',
        });
      } catch (error) {
        fastify.log.error({ error }, 'Failed to invalidate KPI cache');
        return reply.status(500).send({
          error: 'Failed to invalidate KPI cache',
        });
      }
    }
  );
}
