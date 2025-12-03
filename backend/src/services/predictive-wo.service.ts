import { MLInferenceService, AssetPrediction } from "./ml-inference.service";
import { MLExplainabilityService } from "./ml-explainability.service";

export interface PredictiveWorkOrder {
  assetId: string;
  assetName: string;
  workOrderType: "predictive";
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "draft";
  assignedTo?: string;
  failureProbability: number;
  confidence: number;
  topFactors: Array<{ feature: string; contribution: number }>;
  shapExplanation: any;
  createdBy: "ml_system";
  requiresApproval: boolean;
}

export interface PredictiveWOStats {
  totalCreated: number;
  highRisk: number;
  criticalRisk: number;
  deduplicatedCount: number;
  notificationsSent: number;
}

export class PredictiveWOService {
  private readonly inferenceService: MLInferenceService;
  private readonly explainabilityService: MLExplainabilityService;

  // In-memory tracking (in production, use database)
  private recentWorkOrders: Map<string, Date> = new Map();
  private readonly deduplicationWindow = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

  constructor() {
    this.inferenceService = new MLInferenceService();
    this.explainabilityService = new MLExplainabilityService();
  }

  /**
   * Main scheduled job - run daily to create predictive work orders
   */
  async runPredictiveMaintenanceJob(
    modelName: string = "predictive_maintenance",
  ): Promise<PredictiveWOStats> {
    console.log("Starting predictive maintenance job...");

    const stats: PredictiveWOStats = {
      totalCreated: 0,
      highRisk: 0,
      criticalRisk: 0,
      deduplicatedCount: 0,
      notificationsSent: 0,
    };

    try {
      // Step 1: Get all asset predictions
      const predictions = await this.inferenceService.predictAllAssets(
        "predictive-maintenance-v1",
      );

      console.log(`Received ${predictions.length} predictions`);

      // Filter high-risk predictions
      const highRiskPredictions = predictions.filter(
        (p) => (p.failureProbability || 0) >= 0.7,
      );

      console.log(`Found ${highRiskPredictions.length} high-risk predictions`);

      // Step 3: Create work orders for each high-risk asset
      for (const prediction of highRiskPredictions) {
        try {
          // Check deduplication
          if (this.shouldSkipDueToDeduplication(prediction.assetId)) {
            console.log(
              `Skipping ${prediction.assetId} - WO already exists within 7 days`,
            );
            stats.deduplicatedCount++;
            continue;
          }

          // Create predictive work order
          const workOrder = await this.createPredictiveWorkOrder(
            modelName,
            prediction,
          );

          stats.totalCreated++;

          if (workOrder.priority === "critical") {
            stats.criticalRisk++;
          } else if (workOrder.priority === "high") {
            stats.highRisk++;
          }

          // Send notification
          await this.sendNotification(workOrder);
          stats.notificationsSent++;

          // Track for deduplication
          this.recentWorkOrders.set(prediction.assetId, new Date());
        } catch (error: any) {
          console.error(
            `Failed to create WO for ${prediction.assetId}: ${error.message}`,
          );
        }
      }

      console.log(
        `Predictive maintenance job completed: ${JSON.stringify(stats)}`,
      );

      return stats;
    } catch (error: any) {
      console.error(`Predictive maintenance job failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a predictive work order for high-risk asset
   */
  async createPredictiveWorkOrder(
    modelName: string,
    prediction: AssetPrediction,
  ): Promise<PredictiveWorkOrder> {
    console.log(`Creating predictive WO for asset: ${prediction.assetId}`);

    // Get SHAP explanation
    const explanation = await this.explainabilityService.explainPrediction({
      modelName,
      assetId: prediction.assetId,
    });

    // Get asset details (in production, fetch from database)
    const assetName = await this.getAssetName(prediction.assetId);
    const assetOwner = await this.getAssetOwner(prediction.assetId);

    // Determine priority based on probability
    let priority: "low" | "medium" | "high" | "critical";
    let daysUntilFailure: number;
    if ((prediction.failureProbability || 0) >= 0.9) {
      priority = "critical";
      daysUntilFailure = 1;
    } else if ((prediction.failureProbability || 0) >= 0.8) {
      priority = "high";
      daysUntilFailure = 3;
    } else if ((prediction.failureProbability || 0) >= 0.7) {
      priority = "medium";
      daysUntilFailure = 7;
    } else {
      priority = "low"; // Default for probabilities below 0.7
      daysUntilFailure = 30; // Default for lower risk
    }

    // Get explanation (already fetched above, but if we needed fresh one):
    // const explanation = await this.explainabilityService.explainPrediction({...});
    // We can reuse the existing explanation or just rely on the one fetched at the start.
    // The original code fetched it twice, but we can just reuse it if parameters are same.
    // However, the first fetch had topN: 5 (which I removed from call but added to service mock? No, I added explainPrediction to service mock but it just calls getExplanation).
    // Let's just use the 'explanation' variable we already have.

    // If we really need to re-fetch or if the first fetch was for something else (it was for top features),
    // we should use a different variable name if we want to fetch again.
    // But looking at the code, it seems it wants to attach 'shapExplanation' to the work order.
    // The first fetch was used for 'topFactors'.
    // Let's assume the first fetch is sufficient.

    const topFactors = explanation.topFeatures.slice(0, 3).map((f: any) => ({
      feature: f.feature, // Changed from 'factor' to 'feature' to match PredictiveWorkOrder interface
      contribution: f.shapValue, // Changed from 'impact' to 'contribution' to match PredictiveWorkOrder interface
    }));

    const factorsText = topFactors
      .map(
        (f: any) =>
          `${f.feature} (${f.contribution > 0 ? "+" : ""}${f.contribution.toFixed(2)})`,
      )
      .join(", "); // Reverted to comma-separated for description consistency

    // Create work order object
    const workOrder: PredictiveWorkOrder = {
      assetId: prediction.assetId,
      assetName,
      workOrderType: "predictive",
      title: `Predictive Maintenance - ${assetName}`, // Reverted title to original format
      description: `ML model predicted failure probability: ${((prediction.failureProbability || 0) * 100).toFixed(1)}%.

Top contributing factors: ${factorsText}

Recommendation: ${(explanation as any).recommendation || "Schedule inspection and preventive maintenance."}

This work order was automatically generated by the predictive maintenance system and requires supervisor approval before scheduling.`,
      priority,
      status: "draft",
      assignedTo: assetOwner,
      failureProbability: prediction.failureProbability || 0,
      confidence: prediction.confidence || 0.8,
      topFactors,
      shapExplanation: explanation,
      createdBy: "ml_system",
      requiresApproval: true,
    };

    // Save to database (placeholder - in production, call work order service/repository)
    await this.saveWorkOrderToDatabase(workOrder);

    console.log(
      `Created predictive WO for ${prediction.assetId} with priority ${priority}`,
    );

    return workOrder;
  }

  /**
   * Check if work order should be skipped due to deduplication
   */
  private shouldSkipDueToDeduplication(assetId: string): boolean {
    const lastCreated = this.recentWorkOrders.get(assetId);

    if (!lastCreated) {
      return false;
    }

    const timeSinceCreated = Date.now() - lastCreated.getTime();

    return timeSinceCreated < this.deduplicationWindow;
  }

  /**
   * Send notification to assigned user
   */
  private async sendNotification(
    workOrder: PredictiveWorkOrder,
  ): Promise<void> {
    // In production, this would:
    // 1. Send email to supervisor
    // 2. Send push notification
    // 3. Create in-app notification

    console.log(`Sending notification for WO: ${workOrder.title}`);

    // Placeholder notification
    const notification = {
      to: workOrder.assignedTo || "supervisor@example.com",
      subject: `[Action Required] Predictive Maintenance Alert - ${workOrder.assetName}`,
      body: `
A predictive maintenance work order has been created and requires your approval:

Asset: ${workOrder.assetName}
Failure Probability: ${(workOrder.failureProbability * 100).toFixed(1)}%
Priority: ${workOrder.priority.toUpperCase()}

${workOrder.description}

Please review and approve/reject this work order in the dCMMS system.
      `,
    };

    // TODO: Integrate with actual notification service
    console.log(`Notification queued: ${JSON.stringify(notification)}`);
  }

  /**
   * Get asset name (placeholder - in production, query database)
   */
  private async getAssetName(assetId: string): Promise<string> {
    // TODO: Query from database
    return `Asset ${assetId}`;
  }

  /**
   * Get asset owner (placeholder - in production, query database)
   */
  private async getAssetOwner(assetId: string): Promise<string> {
    // TODO: Query from database
    return "supervisor@example.com";
  }

  /**
   * Save work order to database (placeholder)
   */
  private async saveWorkOrderToDatabase(
    workOrder: PredictiveWorkOrder,
  ): Promise<void> {
    // TODO: Save to PostgreSQL work_orders table
    console.log(`Saving WO to database: ${workOrder.title}`);

    /*
    Example SQL:
    INSERT INTO work_orders (
      asset_id,
      work_order_type,
      title,
      description,
      priority,
      status,
      assigned_to,
      metadata,
      created_by,
      created_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()
    )

    metadata JSON should include:
    {
      "ml_generated": true,
      "failure_probability": 0.75,
      "confidence": 0.8,
      "top_factors": [...],
      "shap_explanation": {...},
      "requires_approval": true
    }
    */
  }

  /**
   * Get statistics for predictive work orders
   */
  async getStats(startDate?: Date, endDate?: Date) {
    // In production, query from database
    return {
      totalPredictiveWOs: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      completed: 0,
      approvalRate: 0,
      avgTimeToApproval: 0,
      truePositives: 0,
      falsePositives: 0,
    };
  }

  /**
   * Clean up old deduplication entries
   */
  cleanupDeduplicationCache(): void {
    const now = Date.now();
    const expired: string[] = [];

    for (const [assetId, createdAt] of this.recentWorkOrders.entries()) {
      if (now - createdAt.getTime() > this.deduplicationWindow) {
        expired.push(assetId);
      }
    }

    for (const assetId of expired) {
      this.recentWorkOrders.delete(assetId);
    }

    if (expired.length > 0) {
      console.log(`Cleaned up ${expired.length} expired deduplication entries`);
    }
  }
}
