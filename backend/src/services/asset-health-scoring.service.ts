import { FastifyInstance } from 'fastify';
import { db } from '../db';
import { assets, workOrders, alerts } from '../db/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import { createClient } from '@clickhouse/client';

export interface HealthScoreBreakdown {
  assetId: string;
  score: number;
  category: 'excellent' | 'good' | 'fair' | 'poor';
  components: {
    alarmsScore: number;
    alarmsWeight: number;
    workOrdersScore: number;
    workOrdersWeight: number;
    telemetryScore: number;
    telemetryWeight: number;
    ageScore: number;
    ageWeight: number;
    maintenanceScore: number;
    maintenanceWeight: number;
  };
  recentAlarms: number;
  recentWorkOrders: number;
  anomalyCount: number;
  assetAge: number; // months
  daysSinceLastMaintenance: number;
  calculatedAt: Date;
}

/**
 * Asset Health Scoring Service
 * Calculates asset health scores based on multiple factors
 */
export class AssetHealthScoringService {
  private fastify: FastifyInstance;
  private clickhouse: ReturnType<typeof createClient>;

  // Weight configuration
  private readonly WEIGHTS = {
    alarms: 0.30,           // 30%
    workOrders: 0.20,       // 20%
    telemetry: 0.30,        // 30%
    age: 0.10,              // 10%
    maintenance: 0.10,      // 10%
  };

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
   * Calculate health score for a single asset
   */
  async calculateHealthScore(assetId: string): Promise<HealthScoreBreakdown> {
    this.fastify.log.info({ assetId }, 'Calculating asset health score');

    try {
      // Get asset details
      const asset = await db.query.assets.findFirst({
        where: eq(assets.id, assetId),
      });

      if (!asset) {
        throw new Error(`Asset not found: ${assetId}`);
      }

      // Calculate each component
      const [alarmsScore, alarmsCount] = await this.calculateAlarmsScore(assetId);
      const [workOrdersScore, workOrdersCount] = await this.calculateWorkOrdersScore(assetId);
      const [telemetryScore, anomalyCount] = await this.calculateTelemetryScore(assetId);
      const [ageScore, assetAge] = this.calculateAgeScore(asset.createdAt);
      const [maintenanceScore, daysSince] = await this.calculateMaintenanceScore(assetId);

      // Calculate weighted total score
      const totalScore =
        alarmsScore * this.WEIGHTS.alarms +
        workOrdersScore * this.WEIGHTS.workOrders +
        telemetryScore * this.WEIGHTS.telemetry +
        ageScore * this.WEIGHTS.age +
        maintenanceScore * this.WEIGHTS.maintenance;

      const finalScore = Math.round(totalScore);
      const category = this.getScoreCategory(finalScore);

      this.fastify.log.info(
        { assetId, score: finalScore, category },
        'Asset health score calculated'
      );

      return {
        assetId,
        score: finalScore,
        category,
        components: {
          alarmsScore,
          alarmsWeight: this.WEIGHTS.alarms,
          workOrdersScore,
          workOrdersWeight: this.WEIGHTS.workOrders,
          telemetryScore,
          telemetryWeight: this.WEIGHTS.telemetry,
          ageScore,
          ageWeight: this.WEIGHTS.age,
          maintenanceScore,
          maintenanceWeight: this.WEIGHTS.maintenance,
        },
        recentAlarms: alarmsCount,
        recentWorkOrders: workOrdersCount,
        anomalyCount,
        assetAge,
        daysSinceLastMaintenance: daysSince,
        calculatedAt: new Date(),
      };
    } catch (error) {
      this.fastify.log.error({ error, assetId }, 'Failed to calculate health score');
      throw error;
    }
  }

  /**
   * Calculate health scores for multiple assets (bulk)
   */
  async calculateBulkHealthScores(assetIds: string[]): Promise<HealthScoreBreakdown[]> {
    this.fastify.log.info({ count: assetIds.length }, 'Calculating bulk health scores');

    const scores = await Promise.all(
      assetIds.map((assetId) => this.calculateHealthScore(assetId))
    );

    return scores;
  }

  /**
   * Calculate alarms score component (0-100)
   * Lower score = more alarms
   */
  private async calculateAlarmsScore(assetId: string): Promise<[number, number]> {
    // Get alarm count from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentAlerts = await db.query.alerts.findMany({
      where: and(
        eq(alerts.assetId, assetId),
        gte(alerts.createdAt, thirtyDaysAgo)
      ),
    });

    const alarmCount = recentAlerts.length;
    const criticalCount = recentAlerts.filter((a) => a.severity === 'critical').length;

    // Scoring logic:
    // 0 alarms = 100 score
    // 1-2 alarms = 90 score
    // 3-5 alarms = 70 score
    // 6-10 alarms = 50 score
    // >10 alarms = 30 score
    // Critical alarms count double

    const weightedCount = alarmCount + criticalCount;

    let score = 100;

    if (weightedCount === 0) {
      score = 100;
    } else if (weightedCount <= 2) {
      score = 90;
    } else if (weightedCount <= 5) {
      score = 70;
    } else if (weightedCount <= 10) {
      score = 50;
    } else {
      score = Math.max(30 - (weightedCount - 10) * 2, 10);
    }

    return [score, alarmCount];
  }

  /**
   * Calculate work orders score component (0-100)
   * Lower score = more frequent work orders
   */
  private async calculateWorkOrdersScore(assetId: string): Promise<[number, number]> {
    // Get work order count from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentWOs = await db.query.workOrders.findMany({
      where: and(
        eq(workOrders.assetId, assetId),
        gte(workOrders.createdAt, thirtyDaysAgo)
      ),
    });

    const woCount = recentWOs.length;
    const correctiveCount = recentWOs.filter((wo) => wo.type === 'corrective').length;

    // Scoring logic:
    // 0-1 WOs = 100 score
    // 2-3 WOs = 85 score
    // 4-6 WOs = 70 score
    // 7-10 WOs = 50 score
    // >10 WOs = 30 score
    // Corrective WOs count 1.5x

    const weightedCount = woCount + correctiveCount * 0.5;

    let score = 100;

    if (weightedCount <= 1) {
      score = 100;
    } else if (weightedCount <= 3) {
      score = 85;
    } else if (weightedCount <= 6) {
      score = 70;
    } else if (weightedCount <= 10) {
      score = 50;
    } else {
      score = Math.max(30 - (woCount - 10) * 3, 10);
    }

    return [score, woCount];
  }

  /**
   * Calculate telemetry anomalies score component (0-100)
   * Uses ClickHouse telemetry data
   */
  private async calculateTelemetryScore(assetId: string): Promise<[number, number]> {
    try {
      // Get anomaly count from last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const query = `
        SELECT
          sum(anomaly_count) AS total_anomalies
        FROM telemetry_aggregates
        WHERE asset_id = '${assetId}'
          AND time_bucket >= '${sevenDaysAgo.toISOString()}'
      `;

      const result = await this.clickhouse.query({
        query,
        format: 'JSONEachRow',
      });

      const data = await result.json<{ total_anomalies: number }>();
      const anomalyCount = data[0]?.total_anomalies || 0;

      // Scoring logic:
      // 0 anomalies = 100 score
      // 1-5 anomalies = 90 score
      // 6-15 anomalies = 70 score
      // 16-30 anomalies = 50 score
      // >30 anomalies = 30 score

      let score = 100;

      if (anomalyCount === 0) {
        score = 100;
      } else if (anomalyCount <= 5) {
        score = 90;
      } else if (anomalyCount <= 15) {
        score = 70;
      } else if (anomalyCount <= 30) {
        score = 50;
      } else {
        score = Math.max(30 - (anomalyCount - 30), 10);
      }

      return [score, anomalyCount];
    } catch (error) {
      // If ClickHouse is unavailable or no data, return neutral score
      this.fastify.log.warn({ error, assetId }, 'Failed to get telemetry score, using default');
      return [100, 0];
    }
  }

  /**
   * Calculate age score component (0-100)
   * Newer assets score higher
   */
  private calculateAgeScore(createdAt: Date): [number, number] {
    const now = new Date();
    const ageMs = now.getTime() - createdAt.getTime();
    const ageMonths = Math.floor(ageMs / (30 * 24 * 60 * 60 * 1000));

    // Scoring logic:
    // 0-6 months = 100 score (new)
    // 6-12 months = 95 score
    // 12-24 months = 90 score
    // 24-60 months = 80 score
    // 60+ months = 70 score (aging)

    let score = 100;

    if (ageMonths <= 6) {
      score = 100;
    } else if (ageMonths <= 12) {
      score = 95;
    } else if (ageMonths <= 24) {
      score = 90;
    } else if (ageMonths <= 60) {
      score = 80;
    } else {
      score = Math.max(70 - (ageMonths - 60) / 12, 50);
    }

    return [score, ageMonths];
  }

  /**
   * Calculate maintenance score component (0-100)
   * Recent maintenance = higher score
   */
  private async calculateMaintenanceScore(assetId: string): Promise<[number, number]> {
    // Get most recent completed preventive work order
    const recentMaintenance = await db.query.workOrders.findFirst({
      where: and(
        eq(workOrders.assetId, assetId),
        eq(workOrders.type, 'preventive'),
        eq(workOrders.status, 'completed')
      ),
      orderBy: (workOrders, { desc }) => [desc(workOrders.completedAt)],
    });

    if (!recentMaintenance || !recentMaintenance.completedAt) {
      // No maintenance history = lower score
      return [60, 999];
    }

    const now = new Date();
    const daysSince = Math.floor(
      (now.getTime() - recentMaintenance.completedAt.getTime()) / (24 * 60 * 60 * 1000)
    );

    // Scoring logic:
    // 0-30 days = 100 score (recently maintained)
    // 31-60 days = 90 score
    // 61-90 days = 75 score
    // 91-180 days = 60 score
    // >180 days = 40 score (overdue)

    let score = 100;

    if (daysSince <= 30) {
      score = 100;
    } else if (daysSince <= 60) {
      score = 90;
    } else if (daysSince <= 90) {
      score = 75;
    } else if (daysSince <= 180) {
      score = 60;
    } else {
      score = Math.max(40 - (daysSince - 180) / 10, 20);
    }

    return [score, daysSince];
  }

  /**
   * Get score category from score value
   */
  private getScoreCategory(
    score: number
  ): 'excellent' | 'good' | 'fair' | 'poor' {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }

  /**
   * Close ClickHouse connection
   */
  async close(): Promise<void> {
    await this.clickhouse.close();
    this.fastify.log.info('Asset health scoring ClickHouse connection closed');
  }
}

export function createAssetHealthScoringService(
  fastify: FastifyInstance
): AssetHealthScoringService {
  return new AssetHealthScoringService(fastify);
}
