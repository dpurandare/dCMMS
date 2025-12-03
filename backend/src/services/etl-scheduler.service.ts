import { FastifyInstance } from "fastify";
import cron from "node-cron";
import { createClickHouseETLService } from "./clickhouse-etl.service";

/**
 * ETL Scheduler Service
 * Schedules and manages ClickHouse ETL jobs
 */
export class ETLSchedulerService {
  private fastify: FastifyInstance;
  private etlService: ReturnType<typeof createClickHouseETLService>;
  private cronJob: cron.ScheduledTask | null = null;
  private kpiCronJob: cron.ScheduledTask | null = null;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    this.etlService = createClickHouseETLService(fastify);
  }

  /**
   * Start the ETL scheduler
   */
  async start(): Promise<void> {
    const enabled = process.env.CLICKHOUSE_ETL_ENABLED === "true";

    if (!enabled) {
      this.fastify.log.info("ClickHouse ETL scheduler is disabled");
      return;
    }

    // Test ClickHouse connection first
    const connected = await this.etlService.testConnection();

    if (!connected) {
      this.fastify.log.error(
        "Failed to connect to ClickHouse. ETL scheduler not started.",
      );
      return;
    }

    this.fastify.log.info("Starting ClickHouse ETL scheduler");

    // Get cron schedule from environment (default: 2 AM daily)
    const schedule = process.env.CLICKHOUSE_ETL_SCHEDULE || "0 2 * * *";

    // Schedule incremental ETL sync
    this.cronJob = cron.schedule(schedule, async () => {
      this.fastify.log.info("Running scheduled ETL sync");

      try {
        await this.etlService.runIncrementalSync();
      } catch (error) {
        this.fastify.log.error({ error }, "Scheduled ETL sync failed");
      }
    });

    // Schedule daily KPI snapshot calculation (3 AM daily)
    this.kpiCronJob = cron.schedule("0 3 * * *", async () => {
      this.fastify.log.info("Running scheduled KPI snapshot calculation");

      try {
        // Calculate KPIs for previous day
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        await this.etlService.calculateKPISnapshots(yesterday);
      } catch (error) {
        this.fastify.log.error({ error }, "Scheduled KPI calculation failed");
      }
    });

    this.fastify.log.info(
      { schedule },
      "ClickHouse ETL scheduler started successfully",
    );

    // Run initial sync on startup (optional)
    if (process.env.NODE_ENV === "development") {
      this.fastify.log.info(
        "Running initial ETL sync on startup (development mode)",
      );

      // Don't await, run in background
      this.etlService.runIncrementalSync().catch((error) => {
        this.fastify.log.error({ error }, "Initial ETL sync failed");
      });
    }
  }

  /**
   * Stop the ETL scheduler
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      this.fastify.log.info("ETL cron job stopped");
    }

    if (this.kpiCronJob) {
      this.kpiCronJob.stop();
      this.kpiCronJob = null;
      this.fastify.log.info("KPI cron job stopped");
    }

    // Close ClickHouse connection
    this.etlService.close().catch((error) => {
      this.fastify.log.error(
        { error },
        "Failed to close ClickHouse connection",
      );
    });
  }

  /**
   * Manually trigger ETL sync
   */
  async triggerSync(full: boolean = false): Promise<void> {
    this.fastify.log.info({ full }, "Manually triggering ETL sync");

    try {
      if (full) {
        await this.etlService.runFullSync();
      } else {
        await this.etlService.runIncrementalSync();
      }
    } catch (error) {
      this.fastify.log.error({ error }, "Manual ETL sync failed");
      throw error;
    }
  }

  /**
   * Manually trigger KPI calculation
   */
  async triggerKPICalculation(date?: Date): Promise<void> {
    this.fastify.log.info({ date }, "Manually triggering KPI calculation");

    try {
      await this.etlService.calculateKPISnapshots(date);
    } catch (error) {
      this.fastify.log.error({ error }, "Manual KPI calculation failed");
      throw error;
    }
  }
}

export function createETLSchedulerService(
  fastify: FastifyInstance,
): ETLSchedulerService {
  return new ETLSchedulerService(fastify);
}
