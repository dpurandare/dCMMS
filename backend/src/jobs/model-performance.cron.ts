/**
 * Model Performance Evaluation Cron Job
 *
 * Runs daily to evaluate overdue predictions and calculate model metrics.
 * Schedule: Every day at 3:00 AM (after predictive maintenance job)
 */

import { CronJob } from "cron";
import { ModelPerformanceService } from "../services/model-performance.service";

const performanceService = new ModelPerformanceService();

/**
 * Cron schedule: 0 3 * * * = Every day at 3:00 AM
 *
 * Format: second minute hour day-of-month month day-of-week
 */
export const modelPerformanceJob = new CronJob(
  "0 3 * * *", // Every day at 3:00 AM
  async () => {
    console.log("[CRON] Starting model performance evaluation job...");

    try {
      // Step 1: Evaluate overdue predictions
      console.log("[CRON] Evaluating overdue predictions...");
      const evaluationResult =
        await performanceService.evaluateOverduePredictions();

      console.log("[CRON] Overdue predictions evaluated:");
      console.log(`[CRON]   - Total evaluated: ${evaluationResult.evaluated}`);
      console.log(
        `[CRON]   - Assumed no failure: ${evaluationResult.assumedNoFailure}`,
      );

      // Step 2: Calculate metrics for each model
      const models = ["predictive_maintenance"]; // Add more models as needed

      for (const modelName of models) {
        try {
          console.log(`[CRON] Calculating metrics for model: ${modelName}...`);

          // Calculate metrics for last 30 days
          const endDate = new Date();
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - 30);

          const metrics = await performanceService.calculateMetrics(
            modelName,
            30,
          );

          console.log(`[CRON] Metrics calculated for ${modelName}:`);
          console.log(
            `[CRON]   - Evaluated predictions: ${metrics.evaluatedPredictions}`,
          );
          console.log(`[CRON]   - Precision: ${(metrics.precision || 0).toFixed(3)}`);
          console.log(`[CRON]   - Recall: ${(metrics.recall || 0).toFixed(3)}`);
          console.log(`[CRON]   - F1 Score: ${metrics.f1Score.toFixed(3)}`);
          console.log(`[CRON]   - Accuracy: ${metrics.accuracy.toFixed(3)}`);

          // Check for alerts
          const alerts = await performanceService.getActiveAlerts(modelName);

          if (alerts.length > 0) {
            console.log(
              `[CRON] ⚠️  ${alerts.length} active performance alert(s) for ${modelName}`,
            );
            for (const alert of alerts as any[]) {
              console.log(
                `[CRON]     - [${alert.severity.toUpperCase()}] ${alert.message}`,
              );
            }
          }
        } catch (error) {
          if ((error as any).message.includes("Not enough")) {
            console.log(`[CRON] ${(error as any).message} for ${modelName}`);
          } else {
            console.error(
              `[CRON] Failed to calculate metrics for ${modelName}:`,
              error,
            );
          }
        }
      }

      console.log("[CRON] Model performance evaluation job completed");
    } catch (error) {
      console.error("[CRON] Model performance evaluation job failed:", error);

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
export function startModelPerformanceCron() {
  modelPerformanceJob.start();
  console.log(
    "[CRON] Model performance evaluation job scheduled (daily at 3:00 AM)",
  );
}

/**
 * Stop the cron job
 */
export function stopModelPerformanceCron() {
  modelPerformanceJob.stop();
  console.log("[CRON] Model performance evaluation job stopped");
}

/**
 * Run job immediately (for testing)
 */
export async function runModelPerformanceNow() {
  console.log("[CRON] Running model performance evaluation job immediately...");
  const performanceService = new ModelPerformanceService();

  // Evaluate overdue
  const result = await performanceService.evaluateOverduePredictions();
  console.log(`[CRON] Evaluated ${result.evaluated} overdue predictions`);

  // Calculate metrics
  try {
    const metrics = await performanceService.calculateMetrics(
      "predictive_maintenance",
      30,
    );
    console.log("[CRON] Metrics:", metrics);
    return metrics;
  } catch (error) {
    console.log("[CRON] Could not calculate metrics:", (error as any).message);
    return null;
  }
}

// Auto-start if this file is executed directly
if (require.main === module) {
  console.log("Starting model performance evaluation cron job...");
  startModelPerformanceCron();

  // Keep process alive
  process.on("SIGINT", () => {
    console.log("Stopping cron job...");
    stopModelPerformanceCron();
    process.exit(0);
  });
}
