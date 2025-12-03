import { FastifyInstance } from 'fastify';
import { db } from '../db';
import { workOrders, assets, alerts } from '../db/schema';
import { gte, lte } from 'drizzle-orm';
import { createClient } from '@clickhouse/client';

/**
 * ClickHouse ETL Service
 * Syncs data from PostgreSQL to ClickHouse for analytics
 */
export class ClickHouseETLService {
  private fastify: FastifyInstance;
  private clickhouse: ReturnType<typeof createClient>;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;

    // Initialize ClickHouse client
    this.clickhouse = createClient({
      host: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
      username: process.env.CLICKHOUSE_USER || 'clickhouse_user',
      password: process.env.CLICKHOUSE_PASSWORD || 'clickhouse_password_dev',
      database: process.env.CLICKHOUSE_DATABASE || 'dcmms_analytics',
    });
  }

  /**
   * Run full ETL sync
   */
  async runFullSync(): Promise<void> {
    this.fastify.log.info('Starting full ETL sync to ClickHouse');

    const startTime = Date.now();

    try {
      // Sync work orders
      await this.syncWorkOrders();

      // Sync assets
      await this.syncAssets();

      // Sync alarms
      await this.syncAlarms();

      const duration = Date.now() - startTime;
      this.fastify.log.info(
        { durationMs: duration },
        'Full ETL sync completed successfully'
      );
    } catch (error) {
      this.fastify.log.error({ error }, 'Failed to run full ETL sync');
      throw error;
    }
  }

  /**
   * Run incremental sync (last 24 hours)
   */
  async runIncrementalSync(): Promise<void> {
    this.fastify.log.info('Starting incremental ETL sync to ClickHouse');

    const startTime = Date.now();
    const since = new Date();
    since.setHours(since.getHours() - 24);

    try {
      // Sync work orders created/updated in last 24 hours
      await this.syncWorkOrders(since);

      // Sync assets updated in last 24 hours
      await this.syncAssets(since);

      // Sync alarms from last 24 hours
      await this.syncAlarms(since);

      const duration = Date.now() - startTime;
      this.fastify.log.info(
        { durationMs: duration, since },
        'Incremental ETL sync completed successfully'
      );
    } catch (error) {
      this.fastify.log.error({ error }, 'Failed to run incremental ETL sync');
      throw error;
    }
  }

  /**
   * Sync work orders to ClickHouse
   */
  private async syncWorkOrders(since?: Date): Promise<void> {
    this.fastify.log.info({ since }, 'Syncing work orders to ClickHouse');

    try {
      // Fetch work orders from PostgreSQL
      const query = db.query.workOrders.findMany({
        ...(since && {
          where: gte(workOrders.updatedAt, since),
        }),
        orderBy: (workOrders, { asc }) => [asc(workOrders.createdAt)],
      });

      const orders = await query;

      if (orders.length === 0) {
        this.fastify.log.info('No work orders to sync');
        return;
      }

      // Transform to ClickHouse format
      const rows = orders.map((wo) => {
        const durationHours = wo.actualEnd && wo.actualStart
          ? (wo.actualEnd.getTime() - wo.actualStart.getTime()) / (1000 * 60 * 60)
          : null;

        const mttrHours = wo.actualEnd && wo.createdAt && wo.type === 'corrective'
          ? (wo.actualEnd.getTime() - wo.createdAt.getTime()) / (1000 * 60 * 60)
          : null;

        return {
          wo_id: wo.id,
          tenant_id: wo.tenantId,
          site_id: wo.siteId,
          asset_id: wo.assetId,
          type: wo.type,
          priority: wo.priority,
          status: wo.status,
          assigned_to: wo.assignedTo,
          created_at: wo.createdAt,
          scheduled_start: wo.scheduledStart,
          scheduled_end: wo.scheduledEnd,
          actual_start: wo.actualStart,
          completed_at: wo.actualEnd, // Mapping actualEnd to completed_at in ClickHouse
          duration_hours: durationHours,
          mttr_hours: mttrHours,
          cost: 0, // Estimated cost not available in schema
          parts_count: 0, // TODO: Count from parts table
          tasks_count: 0, // TODO: Count from tasks table
          tasks_completed: 0, // TODO: Count completed tasks
        };
      });

      // Insert to ClickHouse
      await this.clickhouse.insert({
        table: 'wo_metrics',
        values: rows,
        format: 'JSONEachRow',
      });

      this.fastify.log.info(
        { count: rows.length },
        'Work orders synced to ClickHouse successfully'
      );
    } catch (error) {
      this.fastify.log.error({ error }, 'Failed to sync work orders');
      throw error;
    }
  }

  /**
   * Sync assets to ClickHouse
   */
  private async syncAssets(since?: Date): Promise<void> {
    this.fastify.log.info({ since }, 'Syncing assets to ClickHouse');

    try {
      // Fetch assets from PostgreSQL
      const query = db.query.assets.findMany({
        ...(since && {
          where: gte(assets.updatedAt, since),
        }),
        orderBy: (assets, { asc }) => [asc(assets.createdAt)],
      });

      const assetList = await query;

      if (assetList.length === 0) {
        this.fastify.log.info('No assets to sync');
        return;
      }

      // Transform to ClickHouse format
      const rows = assetList.map((asset) => {
        const metadata = typeof asset.metadata === 'string'
          ? JSON.parse(asset.metadata)
          : asset.metadata || {};

        return {
          asset_id: asset.id,
          tenant_id: asset.tenantId,
          site_id: asset.siteId,
          asset_name: asset.name,
          asset_type: asset.type,
          status: asset.status,
          health_score: metadata.healthScore || 100,
          uptime_hours: metadata.uptimeHours || 0,
          downtime_hours: metadata.downtimeHours || 0,
          availability_percent: metadata.availabilityPercent || 100,
          mtbf_hours: metadata.mtbfHours || 0,
          wo_count: 0, // Will be calculated separately
          corrective_wo_count: 0,
          preventive_wo_count: 0,
          alarm_count: 0,
          critical_alarm_count: 0,
          last_maintenance: metadata.lastMaintenance || null,
          next_maintenance: metadata.nextMaintenance || null,
          total_maintenance_cost: 0,
          recorded_at: new Date(),
        };
      });

      // Insert to ClickHouse
      await this.clickhouse.insert({
        table: 'asset_metrics',
        values: rows,
        format: 'JSONEachRow',
      });

      this.fastify.log.info(
        { count: rows.length },
        'Assets synced to ClickHouse successfully'
      );
    } catch (error) {
      this.fastify.log.error({ error }, 'Failed to sync assets');
      throw error;
    }
  }

  /**
   * Sync alarms to ClickHouse
   */
  private async syncAlarms(since?: Date): Promise<void> {
    this.fastify.log.info({ since }, 'Syncing alarms to ClickHouse');

    try {
      // Fetch alerts from PostgreSQL
      const query = db.query.alerts.findMany({
        ...(since && {
          where: gte(alerts.createdAt, since),
        }),
        orderBy: (alerts, { asc }) => [asc(alerts.createdAt)],
      });

      const alertList = await query;

      if (alertList.length === 0) {
        this.fastify.log.info('No alarms to sync');
        return;
      }

      // Transform to ClickHouse format
      const rows = alertList.map((alert) => {
        const timeToAck = alert.acknowledgedAt && alert.createdAt
          ? Math.floor((alert.acknowledgedAt.getTime() - alert.createdAt.getTime()) / 1000)
          : 0;

        const timeToResolve = alert.resolvedAt && alert.createdAt
          ? Math.floor((alert.resolvedAt.getTime() - alert.createdAt.getTime()) / 1000)
          : 0;

        return {
          alarm_id: alert.id,
          tenant_id: alert.tenantId,
          site_id: alert.siteId,
          asset_id: alert.assetId,
          severity: alert.severity,
          status: alert.status,
          alarm_type: 'general',
          message: alert.title,
          created_at: alert.createdAt,
          acknowledged_at: alert.acknowledgedAt,
          resolved_at: alert.resolvedAt,
          time_to_acknowledge_seconds: timeToAck,
          time_to_resolve_seconds: timeToResolve,
        };
      });

      // Insert to ClickHouse
      await this.clickhouse.insert({
        table: 'alarm_metrics',
        values: rows,
        format: 'JSONEachRow',
      });

      this.fastify.log.info(
        { count: rows.length },
        'Alarms synced to ClickHouse successfully'
      );
    } catch (error) {
      this.fastify.log.error({ error }, 'Failed to sync alarms');
      throw error;
    }
  }

  /**
   * Calculate and store KPI snapshots
   */
  async calculateKPISnapshots(date?: Date): Promise<void> {
    const snapshotDate = date || new Date();
    snapshotDate.setHours(0, 0, 0, 0);

    this.fastify.log.info({ snapshotDate }, 'Calculating KPI snapshots');

    try {
      // Calculate KPIs from ClickHouse data
      const query = `
        SELECT
          tenant_id,
          site_id,
          toDate('${snapshotDate.toISOString().split('T')[0]}') AS snapshot_date,

          -- MTTR (corrective WOs only)
          avg(if(type = 'corrective' AND mttr_hours > 0, mttr_hours, NULL)) AS mttr_hours,

          -- WO completion rate
          (countIf(status = 'completed') * 100.0) / count(*) AS wo_completion_rate,

          -- Total counts
          count(*) AS total_wo_count,
          countIf(status = 'completed') AS completed_wo_count,
          countIf(status != 'cancelled' AND scheduled_end < now() AND status != 'completed') AS overdue_wo_count,

          -- Costs
          sum(cost) AS total_maintenance_cost

        FROM wo_metrics
        WHERE toDate(created_at) = toDate('${snapshotDate.toISOString().split('T')[0]}')
        GROUP BY tenant_id, site_id
      `;

      const result = await this.clickhouse.query({
        query,
        format: 'JSONEachRow',
      });

      const rows = await result.json<any[]>();

      if (rows.length === 0) {
        this.fastify.log.info('No KPI data to snapshot');
        return;
      }

      // Insert KPI snapshots
      await this.clickhouse.insert({
        table: 'kpi_snapshots',
        values: rows,
        format: 'JSONEachRow',
      });

      this.fastify.log.info(
        { count: rows.length, date: snapshotDate },
        'KPI snapshots calculated successfully'
      );
    } catch (error) {
      this.fastify.log.error({ error }, 'Failed to calculate KPI snapshots');
      throw error;
    }
  }

  /**
   * Test ClickHouse connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.clickhouse.query({
        query: 'SELECT 1',
        format: 'JSONEachRow',
      });

      await result.json();
      this.fastify.log.info('ClickHouse connection test successful');
      return true;
    } catch (error) {
      this.fastify.log.error({ error }, 'ClickHouse connection test failed');
      return false;
    }
  }

  /**
   * Close ClickHouse connection
   */
  async close(): Promise<void> {
    await this.clickhouse.close();
    this.fastify.log.info('ClickHouse connection closed');
  }
}

export function createClickHouseETLService(fastify: FastifyInstance): ClickHouseETLService {
  return new ClickHouseETLService(fastify);
}
