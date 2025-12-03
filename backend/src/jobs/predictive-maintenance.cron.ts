/**
 * Predictive Maintenance Cron Job
 *
 * Runs daily to create predictive work orders for high-risk assets.
 * Schedule: Every day at 2:00 AM
 */

import { CronJob } from "cron";
import { PredictiveWOService } from "../services/predictive-wo.service";

const predictiveWOService = new PredictiveWOService();

/**
 * Cron schedule: 0 2 * * * = Every day at 2:00 AM
 *
 * Format: second minute hour day-of-month month day-of-week
 */
export const predictiveMaintenanceJob = new CronJob(
  "0 2 * * *", // Every day at 2:00 AM
  async () => {
    console.log("[CRON] Starting predictive maintenance job...");

    try {
      const stats = await predictiveWOService.runPredictiveMaintenanceJob(
        "predictive_maintenance",
      );

      console.log("[CRON] Predictive maintenance job completed:", stats);

      // Send summary email to admin (optional)
      if (stats.totalCreated > 0) {
        console.log(
          `[CRON] Created ${stats.totalCreated} predictive work orders`,
        );
        console.log(`[CRON]   - Critical risk: ${stats.criticalRisk}`);
        console.log(`[CRON]   - High risk: ${stats.highRisk}`);
        console.log(`[CRON]   - Deduplicated: ${stats.deduplicatedCount}`);
      }

      // Cleanup deduplication cache
      predictiveWOService.cleanupDeduplicationCache();
    } catch (error) {
      console.error("[CRON] Predictive maintenance job failed:", error);

      // Send alert to admin (optional)
      // TODO: Integrate with alerting system
    }
  },
  null, // onComplete callback
  false, // start immediately
  "America/New_York", // timezone
);

/**
 * Start the cron job
 */
export function startPredictiveMaintenanceCron() {
  predictiveMaintenanceJob.start();
  console.log("[CRON] Predictive maintenance job scheduled (daily at 2:00 AM)");
}

/**
 * Stop the cron job
 */
export function stopPredictiveMaintenanceCron() {
  predictiveMaintenanceJob.stop();
  console.log("[CRON] Predictive maintenance job stopped");
}

/**
 * Run job immediately (for testing)
 */
export async function runPredictiveMaintenanceNow() {
  console.log("[CRON] Running predictive maintenance job immediately...");
  const stats = await predictiveWOService.runPredictiveMaintenanceJob(
    "predictive_maintenance",
  );
  console.log("[CRON] Job completed:", stats);
  return stats;
}

// Auto-start if this file is executed directly
if (require.main === module) {
  console.log("Starting predictive maintenance cron job...");
  startPredictiveMaintenanceCron();

  // Keep process alive
  process.on("SIGINT", () => {
    console.log("Stopping cron job...");
    stopPredictiveMaintenanceCron();
    process.exit(0);
  });
}
