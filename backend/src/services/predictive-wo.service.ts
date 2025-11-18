import { Injectable, Logger } from '@nestjs/common';
import { MLInferenceService, AssetPrediction } from './ml-inference.service';
import { MLExplainabilityService } from './ml-explainability.service';

export interface PredictiveWorkOrder {
  assetId: string;
  assetName: string;
  workOrderType: 'predictive';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'draft';
  assignedTo?: string;
  failureProbability: number;
  confidence: number;
  topFactors: Array<{ feature: string; contribution: number }>;
  shapExplanation: any;
  createdBy: 'ml_system';
  requiresApproval: boolean;
}

export interface PredictiveWOStats {
  totalCreated: number;
  highRisk: number;
  criticalRisk: number;
  deduplicatedCount: number;
  notificationsSent: number;
}

@Injectable()
export class PredictiveWOService {
  private readonly logger = new Logger(PredictiveWOService.name);
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
  async runPredictiveMaintenanceJob(modelName: string = 'predictive_maintenance'): Promise<PredictiveWOStats> {
    this.logger.log('Starting predictive maintenance job...');

    const stats: PredictiveWOStats = {
      totalCreated: 0,
      highRisk: 0,
      criticalRisk: 0,
      deduplicatedCount: 0,
      notificationsSent: 0,
    };

    try {
      // Step 1: Get all asset predictions
      const predictions = await this.inferenceService.predictAllAssets(modelName);

      this.logger.log(`Received ${predictions.predictions.length} predictions`);

      // Step 2: Filter high-risk predictions (probability >= 0.7)
      const highRiskPredictions = predictions.predictions.filter(
        (p) => p.failureProbability >= 0.7
      );

      this.logger.log(`Found ${highRiskPredictions.length} high-risk predictions`);

      // Step 3: Create work orders for each high-risk asset
      for (const prediction of highRiskPredictions) {
        try {
          // Check deduplication
          if (this.shouldSkipDueToDeduplication(prediction.assetId)) {
            this.logger.log(`Skipping ${prediction.assetId} - WO already exists within 7 days`);
            stats.deduplicatedCount++;
            continue;
          }

          // Create predictive work order
          const workOrder = await this.createPredictiveWorkOrder(
            modelName,
            prediction
          );

          stats.totalCreated++;

          if (workOrder.priority === 'critical') {
            stats.criticalRisk++;
          } else if (workOrder.priority === 'high') {
            stats.highRisk++;
          }

          // Send notification
          await this.sendNotification(workOrder);
          stats.notificationsSent++;

          // Track for deduplication
          this.recentWorkOrders.set(prediction.assetId, new Date());

        } catch (error) {
          this.logger.error(`Failed to create WO for ${prediction.assetId}: ${error.message}`);
        }
      }

      this.logger.log(`Predictive maintenance job completed: ${JSON.stringify(stats)}`);

      return stats;

    } catch (error) {
      this.logger.error(`Predictive maintenance job failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a predictive work order for high-risk asset
   */
  async createPredictiveWorkOrder(
    modelName: string,
    prediction: AssetPrediction
  ): Promise<PredictiveWorkOrder> {
    this.logger.log(`Creating predictive WO for asset: ${prediction.assetId}`);

    // Get SHAP explanation
    const explanation = await this.explainabilityService.explainPrediction({
      modelName,
      assetId: prediction.assetId,
      topN: 5,
    });

    // Get asset details (in production, fetch from database)
    const assetName = await this.getAssetName(prediction.assetId);
    const assetOwner = await this.getAssetOwner(prediction.assetId);

    // Determine priority based on probability
    let priority: 'low' | 'medium' | 'high' | 'critical';
    if (prediction.failureProbability >= 0.9) {
      priority = 'critical';
    } else if (prediction.failureProbability >= 0.8) {
      priority = 'high';
    } else if (prediction.failureProbability >= 0.7) {
      priority = 'high';
    } else {
      priority = 'medium';
    }

    // Format top factors
    const topFactors = explanation.topFeatures.slice(0, 3).map((f) => ({
      feature: f.feature,
      contribution: f.shapValue,
    }));

    const factorsText = topFactors
      .map((f) => `${f.feature} (${f.contribution > 0 ? '+' : ''}${f.contribution.toFixed(2)})`)
      .join(', ');

    // Create work order object
    const workOrder: PredictiveWorkOrder = {
      assetId: prediction.assetId,
      assetName,
      workOrderType: 'predictive',
      title: `Predictive Maintenance - ${assetName}`,
      description: `ML model predicted failure probability: ${(prediction.failureProbability * 100).toFixed(1)}%.

Top contributing factors: ${factorsText}

Recommendation: ${explanation.recommendation || 'Schedule inspection and preventive maintenance.'}

This work order was automatically generated by the predictive maintenance system and requires supervisor approval before scheduling.`,
      priority,
      status: 'draft',
      assignedTo: assetOwner,
      failureProbability: prediction.failureProbability,
      confidence: prediction.confidence || 0.8,
      topFactors,
      shapExplanation: explanation,
      createdBy: 'ml_system',
      requiresApproval: true,
    };

    // Save to database (placeholder - in production, call work order service/repository)
    await this.saveWorkOrderToDatabase(workOrder);

    this.logger.log(`Created predictive WO for ${prediction.assetId} with priority ${priority}`);

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
  private async sendNotification(workOrder: PredictiveWorkOrder): Promise<void> {
    // In production, this would:
    // 1. Send email to supervisor
    // 2. Send push notification
    // 3. Create in-app notification

    this.logger.log(`Sending notification for WO: ${workOrder.title}`);

    // Placeholder notification
    const notification = {
      to: workOrder.assignedTo || 'supervisor@example.com',
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
    this.logger.log(`Notification queued: ${JSON.stringify(notification)}`);
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
    return 'supervisor@example.com';
  }

  /**
   * Save work order to database (placeholder)
   */
  private async saveWorkOrderToDatabase(workOrder: PredictiveWorkOrder): Promise<void> {
    // TODO: Save to PostgreSQL work_orders table
    this.logger.log(`Saving WO to database: ${workOrder.title}`);

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
      this.logger.log(`Cleaned up ${expired.length} expired deduplication entries`);
    }
  }
}
