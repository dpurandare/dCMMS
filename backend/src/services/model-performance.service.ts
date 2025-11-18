import { Injectable, Logger } from '@nestjs/common';

export interface PredictionRecord {
  predictionId: string;
  assetId: string;
  modelName: string;
  modelVersion: string;
  predictedFailure: boolean;
  failureProbability: number;
  predictionDate: Date;
  evaluationWindow: number; // Days to wait before evaluating
  groundTruthRecorded: boolean;
  actualFailure?: boolean;
  failureDate?: Date;
  evaluationDate?: Date;
  predictionCorrect?: boolean;
}

export interface GroundTruthRecord {
  assetId: string;
  failureOccurred: boolean;
  failureDate?: Date;
  workOrderId?: string;
  failureType?: string;
  recordedBy: string;
  timestamp: Date;
}

export interface ModelMetrics {
  modelName: string;
  modelVersion: string;
  evaluationPeriod: {
    start: Date;
    end: Date;
  };
  totalPredictions: number;
  evaluatedPredictions: number;
  truePositives: number;
  trueNegatives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1Score: number;
  accuracy: number;
  approvalRate?: number;
  calculatedAt: Date;
}

export interface PerformanceAlert {
  alertId: string;
  modelName: string;
  modelVersion: string;
  metric: 'precision' | 'recall' | 'f1' | 'accuracy';
  currentValue: number;
  previousValue: number;
  threshold: number;
  severity: 'warning' | 'critical';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

export interface ModelComparisonResult {
  currentModel: {
    version: string;
    metrics: ModelMetrics;
  };
  previousModel?: {
    version: string;
    metrics: ModelMetrics;
  };
  changes: {
    precision: number;
    recall: number;
    f1Score: number;
    accuracy: number;
  };
  recommendation: string;
}

@Injectable()
export class ModelPerformanceService {
  private readonly logger = new Logger(ModelPerformanceService.name);

  // In-memory storage (in production, use database)
  private predictions: Map<string, PredictionRecord> = new Map();
  private groundTruth: Map<string, GroundTruthRecord[]> = new Map();
  private metrics: Map<string, ModelMetrics[]> = new Map(); // Key: modelName
  private alerts: PerformanceAlert[] = [];

  private readonly evaluationWindow = 7; // Days
  private readonly f1DropThreshold = 0.10; // 10% drop
  private readonly minPredictionsForMetrics = 20; // Minimum predictions to calculate metrics

  /**
   * Record a prediction for future evaluation
   */
  async recordPrediction(
    predictionId: string,
    assetId: string,
    modelName: string,
    modelVersion: string,
    predictedFailure: boolean,
    failureProbability: number
  ): Promise<PredictionRecord> {
    this.logger.log(`Recording prediction: ${predictionId} for asset ${assetId}`);

    const record: PredictionRecord = {
      predictionId,
      assetId,
      modelName,
      modelVersion,
      predictedFailure,
      failureProbability,
      predictionDate: new Date(),
      evaluationWindow: this.evaluationWindow,
      groundTruthRecorded: false,
    };

    this.predictions.set(predictionId, record);

    return record;
  }

  /**
   * Record ground truth (whether asset actually failed)
   */
  async recordGroundTruth(groundTruth: GroundTruthRecord): Promise<void> {
    this.logger.log(`Recording ground truth for asset: ${groundTruth.assetId}`);

    // Store ground truth
    const existing = this.groundTruth.get(groundTruth.assetId) || [];
    existing.push(groundTruth);
    this.groundTruth.set(groundTruth.assetId, existing);

    // Update prediction records
    await this.evaluatePredictionsForAsset(groundTruth.assetId, groundTruth);
  }

  /**
   * Automatically record ground truth from work order completion
   */
  async recordGroundTruthFromWorkOrder(
    workOrderId: string,
    assetId: string,
    failureOccurred: boolean,
    failureType?: string
  ): Promise<void> {
    this.logger.log(`Recording ground truth from WO: ${workOrderId}`);

    const groundTruth: GroundTruthRecord = {
      assetId,
      failureOccurred,
      failureDate: failureOccurred ? new Date() : undefined,
      workOrderId,
      failureType,
      recordedBy: 'system',
      timestamp: new Date(),
    };

    await this.recordGroundTruth(groundTruth);
  }

  /**
   * Evaluate predictions for an asset based on ground truth
   */
  private async evaluatePredictionsForAsset(
    assetId: string,
    groundTruth: GroundTruthRecord
  ): Promise<void> {
    // Find all unevaluated predictions for this asset
    const predictionRecords = Array.from(this.predictions.values()).filter(
      (p) => p.assetId === assetId && !p.groundTruthRecorded
    );

    for (const prediction of predictionRecords) {
      // Check if prediction is within evaluation window
      const daysSincePrediction = this.getDaysDifference(
        prediction.predictionDate,
        new Date()
      );

      if (daysSincePrediction >= prediction.evaluationWindow) {
        // Evaluate prediction
        const actualFailure = groundTruth.failureOccurred;
        const predictionCorrect =
          prediction.predictedFailure === actualFailure;

        // Update prediction record
        prediction.groundTruthRecorded = true;
        prediction.actualFailure = actualFailure;
        prediction.failureDate = groundTruth.failureDate;
        prediction.evaluationDate = new Date();
        prediction.predictionCorrect = predictionCorrect;

        this.predictions.set(prediction.predictionId, prediction);

        this.logger.log(
          `Evaluated prediction ${prediction.predictionId}: ` +
            `predicted=${prediction.predictedFailure}, actual=${actualFailure}, ` +
            `correct=${predictionCorrect}`
        );
      }
    }
  }

  /**
   * Automatically evaluate predictions that have passed their evaluation window
   */
  async evaluateOverduePredictions(): Promise<{
    evaluated: number;
    assumedNoFailure: number;
  }> {
    this.logger.log('Evaluating overdue predictions...');

    let evaluated = 0;
    let assumedNoFailure = 0;

    const now = new Date();

    for (const [predictionId, prediction] of this.predictions.entries()) {
      // Skip already evaluated
      if (prediction.groundTruthRecorded) {
        continue;
      }

      const daysSincePrediction = this.getDaysDifference(
        prediction.predictionDate,
        now
      );

      // If evaluation window has passed and no ground truth recorded
      if (daysSincePrediction >= prediction.evaluationWindow) {
        // Assume no failure occurred (conservative assumption)
        prediction.groundTruthRecorded = true;
        prediction.actualFailure = false;
        prediction.evaluationDate = now;
        prediction.predictionCorrect = !prediction.predictedFailure;

        this.predictions.set(predictionId, prediction);

        evaluated++;
        assumedNoFailure++;

        this.logger.log(
          `Evaluated overdue prediction ${predictionId}: ` +
            `assumed no failure (${daysSincePrediction} days since prediction)`
        );
      }
    }

    this.logger.log(
      `Evaluated ${evaluated} overdue predictions (${assumedNoFailure} assumed no failure)`
    );

    return { evaluated, assumedNoFailure };
  }

  /**
   * Calculate model performance metrics
   */
  async calculateMetrics(
    modelName: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ModelMetrics> {
    this.logger.log(`Calculating metrics for model: ${modelName}`);

    // Filter predictions by model and date range
    const relevantPredictions = Array.from(this.predictions.values()).filter(
      (p) => {
        if (p.modelName !== modelName) return false;
        if (!p.groundTruthRecorded) return false;

        if (startDate && p.predictionDate < startDate) return false;
        if (endDate && p.predictionDate > endDate) return false;

        return true;
      }
    );

    if (relevantPredictions.length < this.minPredictionsForMetrics) {
      throw new Error(
        `Not enough evaluated predictions (${relevantPredictions.length}). ` +
          `Minimum required: ${this.minPredictionsForMetrics}`
      );
    }

    // Calculate confusion matrix
    let truePositives = 0;
    let trueNegatives = 0;
    let falsePositives = 0;
    let falseNegatives = 0;

    for (const prediction of relevantPredictions) {
      if (prediction.predictedFailure && prediction.actualFailure) {
        truePositives++;
      } else if (!prediction.predictedFailure && !prediction.actualFailure) {
        trueNegatives++;
      } else if (prediction.predictedFailure && !prediction.actualFailure) {
        falsePositives++;
      } else if (!prediction.predictedFailure && prediction.actualFailure) {
        falseNegatives++;
      }
    }

    // Calculate metrics
    const precision =
      truePositives + falsePositives > 0
        ? truePositives / (truePositives + falsePositives)
        : 0;

    const recall =
      truePositives + falseNegatives > 0
        ? truePositives / (truePositives + falseNegatives)
        : 0;

    const f1Score =
      precision + recall > 0
        ? (2 * precision * recall) / (precision + recall)
        : 0;

    const accuracy =
      relevantPredictions.length > 0
        ? (truePositives + trueNegatives) / relevantPredictions.length
        : 0;

    // Get model version (from latest prediction)
    const latestPrediction = relevantPredictions.sort(
      (a, b) => b.predictionDate.getTime() - a.predictionDate.getTime()
    )[0];

    const metrics: ModelMetrics = {
      modelName,
      modelVersion: latestPrediction.modelVersion,
      evaluationPeriod: {
        start: startDate || new Date(0),
        end: endDate || new Date(),
      },
      totalPredictions: relevantPredictions.length,
      evaluatedPredictions: relevantPredictions.length,
      truePositives,
      trueNegatives,
      falsePositives,
      falseNegatives,
      precision,
      recall,
      f1Score,
      accuracy,
      calculatedAt: new Date(),
    };

    // Store metrics
    const existingMetrics = this.metrics.get(modelName) || [];
    existingMetrics.push(metrics);
    this.metrics.set(modelName, existingMetrics);

    // Check for performance degradation
    await this.checkPerformanceDegradation(metrics);

    this.logger.log(
      `Metrics calculated for ${modelName} v${metrics.modelVersion}: ` +
        `Precision=${precision.toFixed(3)}, Recall=${recall.toFixed(3)}, ` +
        `F1=${f1Score.toFixed(3)}, Accuracy=${accuracy.toFixed(3)}`
    );

    return metrics;
  }

  /**
   * Check for performance degradation and create alerts
   */
  private async checkPerformanceDegradation(
    currentMetrics: ModelMetrics
  ): Promise<void> {
    // Get previous metrics for comparison
    const allMetrics = this.metrics.get(currentMetrics.modelName) || [];

    if (allMetrics.length < 2) {
      // Need at least 2 metric calculations for comparison
      return;
    }

    // Get previous metrics (second to last)
    const previousMetrics = allMetrics[allMetrics.length - 2];

    // Check F1 score degradation
    const f1Drop = previousMetrics.f1Score - currentMetrics.f1Score;
    const f1DropPercentage = f1Drop / previousMetrics.f1Score;

    if (f1DropPercentage > this.f1DropThreshold) {
      // F1 score dropped more than threshold
      const alert: PerformanceAlert = {
        alertId: `alert_${Date.now()}`,
        modelName: currentMetrics.modelName,
        modelVersion: currentMetrics.modelVersion,
        metric: 'f1',
        currentValue: currentMetrics.f1Score,
        previousValue: previousMetrics.f1Score,
        threshold: this.f1DropThreshold,
        severity: f1DropPercentage > 0.2 ? 'critical' : 'warning',
        message:
          `F1 score dropped ${(f1DropPercentage * 100).toFixed(1)}% ` +
          `(from ${previousMetrics.f1Score.toFixed(3)} to ${currentMetrics.f1Score.toFixed(3)}). ` +
          `Consider retraining the model.`,
        timestamp: new Date(),
        acknowledged: false,
      };

      this.alerts.push(alert);

      this.logger.warn(
        `Performance alert: ${alert.message} (Alert ID: ${alert.alertId})`
      );

      // Send notification (optional)
      await this.sendPerformanceAlert(alert);
    }

    // Check precision degradation
    const precisionDrop =
      previousMetrics.precision - currentMetrics.precision;
    if (precisionDrop / previousMetrics.precision > 0.15) {
      const alert: PerformanceAlert = {
        alertId: `alert_${Date.now()}`,
        modelName: currentMetrics.modelName,
        modelVersion: currentMetrics.modelVersion,
        metric: 'precision',
        currentValue: currentMetrics.precision,
        previousValue: previousMetrics.precision,
        threshold: 0.15,
        severity: 'warning',
        message:
          `Precision dropped ${((precisionDrop / previousMetrics.precision) * 100).toFixed(1)}% ` +
          `(from ${previousMetrics.precision.toFixed(3)} to ${currentMetrics.precision.toFixed(3)}). ` +
          `Too many false positives.`,
        timestamp: new Date(),
        acknowledged: false,
      };

      this.alerts.push(alert);
      this.logger.warn(`Performance alert: ${alert.message}`);
    }

    // Check recall degradation
    const recallDrop = previousMetrics.recall - currentMetrics.recall;
    if (recallDrop / previousMetrics.recall > 0.15) {
      const alert: PerformanceAlert = {
        alertId: `alert_${Date.now()}`,
        modelName: currentMetrics.modelName,
        modelVersion: currentMetrics.modelVersion,
        metric: 'recall',
        currentValue: currentMetrics.recall,
        previousValue: previousMetrics.recall,
        threshold: 0.15,
        severity: 'warning',
        message:
          `Recall dropped ${((recallDrop / previousMetrics.recall) * 100).toFixed(1)}% ` +
          `(from ${previousMetrics.recall.toFixed(3)} to ${currentMetrics.recall.toFixed(3)}). ` +
          `Missing failures.`,
        timestamp: new Date(),
        acknowledged: false,
      };

      this.alerts.push(alert);
      this.logger.warn(`Performance alert: ${alert.message}`);
    }
  }

  /**
   * Compare current model with previous version
   */
  async compareModelVersions(
    modelName: string,
    currentVersion: string,
    previousVersion?: string
  ): Promise<ModelComparisonResult> {
    this.logger.log(
      `Comparing model versions: ${currentVersion} vs ${previousVersion || 'previous'}`
    );

    const allMetrics = this.metrics.get(modelName) || [];

    // Find current model metrics
    const currentMetrics = allMetrics.find(
      (m) => m.modelVersion === currentVersion
    );

    if (!currentMetrics) {
      // Sanitize user-controlled input to prevent log injection
      const safeModelName = typeof modelName === 'string' ? modelName.replace(/[\r\n]+/g, ' ') : modelName;
      const safeCurrentVersion = typeof currentVersion === 'string' ? currentVersion.replace(/[\r\n]+/g, ' ') : currentVersion;
      throw new Error(
        `No metrics found for model ${safeModelName} version ${safeCurrentVersion}`
      );
    }

    // Find previous model metrics
    let previousMetrics: ModelMetrics | undefined;

    if (previousVersion) {
      previousMetrics = allMetrics.find(
        (m) => m.modelVersion === previousVersion
      );
    } else {
      // Get latest metrics before current version
      const sortedMetrics = allMetrics
        .filter((m) => m.modelVersion !== currentVersion)
        .sort(
          (a, b) =>
            b.calculatedAt.getTime() - a.calculatedAt.getTime()
        );

      previousMetrics = sortedMetrics[0];
    }

    // Calculate changes
    const changes = {
      precision: previousMetrics
        ? currentMetrics.precision - previousMetrics.precision
        : 0,
      recall: previousMetrics
        ? currentMetrics.recall - previousMetrics.recall
        : 0,
      f1Score: previousMetrics
        ? currentMetrics.f1Score - previousMetrics.f1Score
        : 0,
      accuracy: previousMetrics
        ? currentMetrics.accuracy - previousMetrics.accuracy
        : 0,
    };

    // Generate recommendation
    let recommendation = '';

    if (!previousMetrics) {
      recommendation = 'No previous model for comparison. Deploy with caution.';
    } else if (changes.f1Score > 0.05) {
      recommendation =
        'New model shows significant improvement. Recommend deployment.';
    } else if (changes.f1Score < -0.05) {
      recommendation =
        'New model shows degradation. Do not deploy. Investigate issues.';
    } else if (changes.precision > 0.05 && changes.recall < -0.05) {
      recommendation =
        'Higher precision but lower recall. Consider use case requirements.';
    } else if (changes.recall > 0.05 && changes.precision < -0.05) {
      recommendation =
        'Higher recall but lower precision. May increase false positives.';
    } else {
      recommendation =
        'Similar performance to previous model. Safe to deploy if other criteria met.';
    }

    return {
      currentModel: {
        version: currentVersion,
        metrics: currentMetrics,
      },
      previousModel: previousMetrics
        ? {
            version: previousMetrics.modelVersion,
            metrics: previousMetrics,
          }
        : undefined,
      changes,
      recommendation,
    };
  }

  /**
   * Get model metrics history
   */
  async getMetricsHistory(
    modelName: string,
    limit: number = 10
  ): Promise<ModelMetrics[]> {
    const allMetrics = this.metrics.get(modelName) || [];

    return allMetrics
      .sort((a, b) => b.calculatedAt.getTime() - a.calculatedAt.getTime())
      .slice(0, limit);
  }

  /**
   * Get active performance alerts
   */
  async getActiveAlerts(modelName?: string): Promise<PerformanceAlert[]> {
    let alerts = this.alerts.filter((a) => !a.acknowledged);

    if (modelName) {
      alerts = alerts.filter((a) => a.modelName === modelName);
    }

    return alerts.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string): Promise<void> {
    const alert = this.alerts.find((a) => a.alertId === alertId);

    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    alert.acknowledged = true;
    this.logger.log(`Alert ${alertId} acknowledged`);
  }

  /**
   * Get prediction accuracy breakdown by risk level
   */
  async getPredictionAccuracyByRisk(modelName: string): Promise<{
    highRisk: { total: number; correct: number; accuracy: number };
    mediumRisk: { total: number; correct: number; accuracy: number };
    lowRisk: { total: number; correct: number; accuracy: number };
  }> {
    const predictions = Array.from(this.predictions.values()).filter(
      (p) => p.modelName === modelName && p.groundTruthRecorded
    );

    const highRisk = predictions.filter((p) => p.failureProbability >= 0.7);
    const mediumRisk = predictions.filter(
      (p) => p.failureProbability >= 0.4 && p.failureProbability < 0.7
    );
    const lowRisk = predictions.filter((p) => p.failureProbability < 0.4);

    const calculateAccuracy = (preds: PredictionRecord[]) => {
      if (preds.length === 0) return { total: 0, correct: 0, accuracy: 0 };

      const correct = preds.filter((p) => p.predictionCorrect).length;
      return {
        total: preds.length,
        correct,
        accuracy: correct / preds.length,
      };
    };

    return {
      highRisk: calculateAccuracy(highRisk),
      mediumRisk: calculateAccuracy(mediumRisk),
      lowRisk: calculateAccuracy(lowRisk),
    };
  }

  // ===== Private Methods =====

  /**
   * Get difference in days between two dates
   */
  private getDaysDifference(date1: Date, date2: Date): number {
    const diffMs = date2.getTime() - date1.getTime();
    return diffMs / (1000 * 60 * 60 * 24);
  }

  /**
   * Send performance alert notification
   */
  private async sendPerformanceAlert(alert: PerformanceAlert): Promise<void> {
    // TODO: Integrate with notification service
    // - Email ML team
    // - Slack notification
    // - PagerDuty (for critical alerts)

    this.logger.log(
      `[ALERT] ${alert.severity.toUpperCase()}: ${alert.message}`
    );
  }

  /**
   * Get prediction statistics
   */
  async getPredictionStats(modelName: string): Promise<{
    totalPredictions: number;
    evaluatedPredictions: number;
    pendingEvaluation: number;
    evaluationRate: number;
  }> {
    const predictions = Array.from(this.predictions.values()).filter(
      (p) => p.modelName === modelName
    );

    const total = predictions.length;
    const evaluated = predictions.filter((p) => p.groundTruthRecorded).length;
    const pending = total - evaluated;

    return {
      totalPredictions: total,
      evaluatedPredictions: evaluated,
      pendingEvaluation: pending,
      evaluationRate: total > 0 ? evaluated / total : 0,
    };
  }
}
