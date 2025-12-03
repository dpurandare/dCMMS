import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createETLSchedulerService } from '../services/etl-scheduler.service';
import { createClickHouseETLService } from '../services/clickhouse-etl.service';

// Validation schemas
const triggerETLSchema = z.object({
  full: z.boolean().optional().default(false),
});

const calculateKPISchema = z.object({
  date: z.string().optional(),
});

/**
 * Analytics Admin Routes
 * Admin endpoints for managing ClickHouse ETL and analytics
 */
export default async function analyticsAdminRoutes(fastify: FastifyInstance) {
  const etlScheduler = createETLSchedulerService(fastify);
  const clickhouseETL = createClickHouseETLService(fastify);

  // ==========================================
  // ETL Management Endpoints
  // ==========================================

  // Trigger ETL sync manually
  fastify.post<{
    Body: z.infer<typeof triggerETLSchema>;
  }>(
    '/admin/analytics/etl/trigger',
    {
      schema: {
        body: triggerETLSchema,
        tags: ['Admin', 'Analytics'],
        description: 'Manually trigger ETL sync to ClickHouse',
      },
    },
    async (request, reply) => {
      try {
        const { full } = request.body;

        fastify.log.info({ full, userId: (request.user as any)?.id }, 'ETL sync triggered manually');

        // Trigger sync asynchronously
        etlScheduler.triggerSync(full).catch((error) => {
          fastify.log.error({ error }, 'Manual ETL sync failed');
        });

        return reply.send({
          success: true,
          message: `${full ? 'Full' : 'Incremental'} ETL sync triggered`,
          type: full ? 'full' : 'incremental',
        });
      } catch (error) {
        fastify.log.error({ error }, 'Failed to trigger ETL sync');
        return reply.status(500).send({
          error: 'Failed to trigger ETL sync',
        });
      }
    }
  );

  // Calculate KPI snapshots manually
  fastify.post<{
    Body: z.infer<typeof calculateKPISchema>;
  }>(
    '/admin/analytics/kpi/calculate',
    {
      schema: {
        body: calculateKPISchema,
        tags: ['Admin', 'Analytics'],
        description: 'Manually trigger KPI snapshot calculation',
      },
    },
    async (request, reply) => {
      try {
        const { date } = request.body;
        const targetDate = date ? new Date(date) : undefined;

        fastify.log.info(
          { date: targetDate, userId: (request.user as any)?.id },
          'KPI calculation triggered manually'
        );

        // Trigger calculation asynchronously
        etlScheduler.triggerKPICalculation(targetDate).catch((error) => {
          fastify.log.error({ error }, 'Manual KPI calculation failed');
        });

        return reply.send({
          success: true,
          message: 'KPI snapshot calculation triggered',
          date: targetDate || new Date(),
        });
      } catch (error) {
        fastify.log.error({ error }, 'Failed to trigger KPI calculation');
        return reply.status(500).send({
          error: 'Failed to trigger KPI calculation',
        });
      }
    }
  );

  // Test ClickHouse connection
  fastify.get(
    '/admin/analytics/clickhouse/test',
    {
      schema: {
        tags: ['Admin', 'Analytics'],
        description: 'Test ClickHouse connection',
      },
    },
    async (request, reply) => {
      try {
        const connected = await clickhouseETL.testConnection();

        return reply.send({
          success: connected,
          message: connected
            ? 'ClickHouse connection successful'
            : 'ClickHouse connection failed',
        });
      } catch (error) {
        fastify.log.error({ error }, 'ClickHouse connection test failed');
        return reply.status(500).send({
          success: false,
          error: 'Failed to test ClickHouse connection',
        });
      }
    }
  );

  // Get ETL status
  fastify.get(
    '/admin/analytics/etl/status',
    {
      schema: {
        tags: ['Admin', 'Analytics'],
        description: 'Get ETL scheduler status',
      },
    },
    async (request, reply) => {
      try {
        const enabled = process.env.CLICKHOUSE_ETL_ENABLED === 'true';
        const schedule = process.env.CLICKHOUSE_ETL_SCHEDULE || '0 2 * * *';

        return reply.send({
          enabled,
          schedule,
          clickhouseHost: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
          clickhouseDatabase: process.env.CLICKHOUSE_DATABASE || 'dcmms_analytics',
          batchSize: parseInt(process.env.CLICKHOUSE_ETL_BATCH_SIZE || '1000'),
        });
      } catch (error) {
        fastify.log.error({ error }, 'Failed to get ETL status');
        return reply.status(500).send({
          error: 'Failed to get ETL status',
        });
      }
    }
  );

  // ==========================================
  // ClickHouse Query Endpoints (for testing)
  // ==========================================

  // Execute custom ClickHouse query (dev/test only)
  if (process.env.NODE_ENV === 'development') {
    fastify.post<{
      Body: {
        query: string;
      };
    }>(
      '/admin/analytics/query',
      {
        schema: {
          body: z.object({
            query: z.string(),
          }),
          tags: ['Admin', 'Analytics'],
          description: 'Execute custom ClickHouse query (development only)',
        },
      },
      async (request, reply) => {
        try {
          const { query } = request.body;

          fastify.log.info({ query, userId: (request.user as any)?.id }, 'Executing custom ClickHouse query');

          // Create temporary ClickHouse client
          const { createClient } = await import('@clickhouse/client');
          const client = createClient({
            host: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
            username: process.env.CLICKHOUSE_USER || 'clickhouse_user',
            password: process.env.CLICKHOUSE_PASSWORD || 'clickhouse_password_dev',
            database: process.env.CLICKHOUSE_DATABASE || 'dcmms_analytics',
          });

          const result = await client.query({
            query,
            format: 'JSONEachRow',
          });

          const data = await result.json();

          await client.close();

          return reply.send({
            success: true,
            rows: (data as any[]).length,
            data,
          });
        } catch (error: any) {
          fastify.log.error({ error }, 'Failed to execute ClickHouse query');
          return reply.status(500).send({
            error: 'Failed to execute query',
            message: error.message,
          });
        }
      }
    );
  }
}
