import { FastifyInstance } from 'fastify';
import { createClient } from '@clickhouse/client';
import Redis from 'ioredis';

export interface KPIFilters {
  tenantId: string;
  siteId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface KPIResult {
  mttr: number; // Mean Time To Repair (hours)
  mtbf: number; // Mean Time Between Failures (hours)
  completionRate: number; // Percentage
  availability: number; // Percentage
  pmCompliance: number; // Percentage
  firstTimeFixRate: number; // Percentage
  totalWorkOrders: number;
  completedWorkOrders: number;
  overdueWorkOrders: number;
  criticalAlarms: number;
  totalDowntimeHours: number;
  totalMaintenanceCost: number;
  calculatedAt: Date;
  period: {
    startDate: Date;
    endDate: Date;
  };
}

/**
 * KPI Calculation Service
 * Calculates key performance indicators from ClickHouse analytics data
 */
export class KPICalculationService {
  private fastify: FastifyInstance;
  private clickhouse: ReturnType<typeof createClient>;
  private redis: Redis;
  private readonly CACHE_TTL = 3600; // 1 hour

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;

    // Initialize ClickHouse client
    this.clickhouse = createClient({
      host: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
      username: process.env.CLICKHOUSE_USER || 'clickhouse_user',
      password: process.env.CLICKHOUSE_PASSWORD || 'clickhouse_password_dev',
      database: process.env.CLICKHOUSE_DATABASE || 'dcmms_analytics',
    });

    // Initialize Redis client
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0'),
    });
  }

  /**
   * Calculate KPIs for given filters
   */
  async calculateKPIs(filters: KPIFilters): Promise<KPIResult> {
    this.fastify.log.info({ filters }, 'Calculating KPIs');

    try {
      // Check cache first
      const cacheKey = this.getCacheKey(filters);
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        this.fastify.log.info({ cacheKey }, 'KPIs returned from cache');
        const result = JSON.parse(cached);
        return {
          ...result,
          calculatedAt: new Date(result.calculatedAt),
          period: {
            startDate: new Date(result.period.startDate),
            endDate: new Date(result.period.endDate),
          },
        };
      }

      // Calculate KPIs from ClickHouse
      const result = await this.calculateFromClickHouse(filters);

      // Cache result
      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(result));

      this.fastify.log.info({ cacheKey, ttl: this.CACHE_TTL }, 'KPIs calculated and cached');

      return result;
    } catch (error) {
      this.fastify.log.error({ error, filters }, 'Failed to calculate KPIs');
      throw error;
    }
  }

  /**
   * Calculate KPIs from ClickHouse
   */
  private async calculateFromClickHouse(filters: KPIFilters): Promise<KPIResult> {
    const { tenantId, siteId, startDate, endDate } = filters;

    // Default to last 30 days if no dates provided
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Build WHERE clause
    const whereClauses = [`tenant_id = '${tenantId}'`];

    if (siteId) {
      whereClauses.push(`site_id = '${siteId}'`);
    }

    whereClauses.push(`created_at >= '${start.toISOString()}'`);
    whereClauses.push(`created_at <= '${end.toISOString()}'`);

    const whereClause = whereClauses.join(' AND ');

    // Calculate MTTR (Mean Time To Repair) - corrective work orders only
    const mttrQuery = `
      SELECT
        avg(mttr_hours) AS mttr
      FROM wo_metrics
      WHERE ${whereClause}
        AND type = 'corrective'
        AND mttr_hours > 0
        AND status = 'completed'
    `;

    const mttrResult = await this.clickhouse.query({
      query: mttrQuery,
      format: 'JSONEachRow',
    });

    const mttrData = await mttrResult.json<{ mttr: number }>();
    const mttr = mttrData[0]?.mttr || 0;

    // Calculate MTBF (Mean Time Between Failures)
    // MTBF = total operating time / number of failures
    const mtbfQuery = `
      SELECT
        count() AS failure_count,
        sum(duration_hours) AS total_operating_hours
      FROM wo_metrics
      WHERE ${whereClause}
        AND type = 'corrective'
        AND status = 'completed'
    `;

    const mtbfResult = await this.clickhouse.query({
      query: mtbfQuery,
      format: 'JSONEachRow',
    });

    const mtbfData = await mtbfResult.json<{
      failure_count: number;
      total_operating_hours: number;
    }>();
    const mtbf =
      mtbfData[0]?.failure_count > 0
        ? mtbfData[0].total_operating_hours / mtbfData[0].failure_count
        : 0;

    // Calculate Work Order Completion Rate
    const completionQuery = `
      SELECT
        count() AS total_wo,
        countIf(status = 'completed') AS completed_wo,
        countIf(status != 'cancelled' AND scheduled_end < now() AND status != 'completed') AS overdue_wo
      FROM wo_metrics
      WHERE ${whereClause}
    `;

    const completionResult = await this.clickhouse.query({
      query: completionQuery,
      format: 'JSONEachRow',
    });

    const completionData = await completionResult.json<{
      total_wo: number;
      completed_wo: number;
      overdue_wo: number;
    }>();

    const totalWO = completionData[0]?.total_wo || 0;
    const completedWO = completionData[0]?.completed_wo || 0;
    const overdueWO = completionData[0]?.overdue_wo || 0;
    const completionRate = totalWO > 0 ? (completedWO / totalWO) * 100 : 0;

    // Calculate PM Compliance (completed PM WOs / scheduled PM WOs)
    const pmQuery = `
      SELECT
        countIf(type = 'preventive') AS scheduled_pm,
        countIf(type = 'preventive' AND status = 'completed') AS completed_pm
      FROM wo_metrics
      WHERE ${whereClause}
    `;

    const pmResult = await this.clickhouse.query({
      query: pmQuery,
      format: 'JSONEachRow',
    });

    const pmData = await pmResult.json<{
      scheduled_pm: number;
      completed_pm: number;
    }>();

    const scheduledPM = pmData[0]?.scheduled_pm || 0;
    const completedPM = pmData[0]?.completed_pm || 0;
    const pmCompliance = scheduledPM > 0 ? (completedPM / scheduledPM) * 100 : 0;

    // Calculate First Time Fix Rate
    // Assuming a work order is "first time fix" if it's completed and not reopened
    // For now, we'll use completion rate as proxy (would need reopened tracking)
    const firstTimeFixRate = completionRate; // TODO: Implement proper tracking

    // Calculate Asset Availability
    const availabilityQuery = `
      SELECT
        avg(availability_percent) AS avg_availability,
        sum(downtime_hours) AS total_downtime
      FROM asset_metrics
      WHERE tenant_id = '${tenantId}'
        ${siteId ? `AND site_id = '${siteId}'` : ''}
        AND recorded_at >= '${start.toISOString()}'
        AND recorded_at <= '${end.toISOString()}'
    `;

    const availabilityResult = await this.clickhouse.query({
      query: availabilityQuery,
      format: 'JSONEachRow',
    });

    const availabilityData = await availabilityResult.json<{
      avg_availability: number;
      total_downtime: number;
    }>();

    const availability = availabilityData[0]?.avg_availability || 100;
    const totalDowntime = availabilityData[0]?.total_downtime || 0;

    // Get critical alarm count
    const alarmQuery = `
      SELECT
        countIf(severity = 'critical') AS critical_alarms
      FROM alarm_metrics
      WHERE ${whereClause}
    `;

    const alarmResult = await this.clickhouse.query({
      query: alarmQuery,
      format: 'JSONEachRow',
    });

    const alarmData = await alarmResult.json<{ critical_alarms: number }>();
    const criticalAlarms = alarmData[0]?.critical_alarms || 0;

    // Calculate total maintenance cost
    const costQuery = `
      SELECT
        sum(cost) AS total_cost
      FROM wo_metrics
      WHERE ${whereClause}
    `;

    const costResult = await this.clickhouse.query({
      query: costQuery,
      format: 'JSONEachRow',
    });

    const costData = await costResult.json<{ total_cost: number }>();
    const totalCost = costData[0]?.total_cost || 0;

    return {
      mttr: parseFloat(mttr.toFixed(2)),
      mtbf: parseFloat(mtbf.toFixed(2)),
      completionRate: parseFloat(completionRate.toFixed(2)),
      availability: parseFloat(availability.toFixed(2)),
      pmCompliance: parseFloat(pmCompliance.toFixed(2)),
      firstTimeFixRate: parseFloat(firstTimeFixRate.toFixed(2)),
      totalWorkOrders: totalWO,
      completedWorkOrders: completedWO,
      overdueWorkOrders: overdueWO,
      criticalAlarms,
      totalDowntimeHours: parseFloat(totalDowntime.toFixed(2)),
      totalMaintenanceCost: parseFloat(totalCost.toFixed(2)),
      calculatedAt: new Date(),
      period: {
        startDate: start,
        endDate: end,
      },
    };
  }

  /**
   * Generate cache key for KPI filters
   */
  private getCacheKey(filters: KPIFilters): string {
    const { tenantId, siteId, startDate, endDate } = filters;

    const parts = ['kpis', tenantId];

    if (siteId) {
      parts.push(siteId);
    }

    if (startDate) {
      parts.push(startDate.toISOString().split('T')[0]);
    }

    if (endDate) {
      parts.push(endDate.toISOString().split('T')[0]);
    }

    return parts.join(':');
  }

  /**
   * Invalidate KPI cache for tenant/site
   */
  async invalidateCache(tenantId: string, siteId?: string): Promise<void> {
    try {
      const pattern = siteId ? `kpis:${tenantId}:${siteId}:*` : `kpis:${tenantId}:*`;

      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.fastify.log.info({ pattern, count: keys.length }, 'KPI cache invalidated');
      }
    } catch (error) {
      this.fastify.log.error({ error }, 'Failed to invalidate KPI cache');
    }
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    await this.clickhouse.close();
    this.redis.disconnect();
    this.fastify.log.info('KPI service connections closed');
  }
}

export function createKPICalculationService(fastify: FastifyInstance): KPICalculationService {
  return new KPICalculationService(fastify);
}
