/**
 * Model Performance Service
 *
 * Mock implementation for development/build without external dependencies.
 */

export class ModelPerformanceService {
  constructor() {
    console.log("Model Performance Service initialized (Mock Provider)");
  }

  async trackPredictionAccuracy(
    predictionId: string,
    actualValue: number,
  ): Promise<void> {
    console.log(`[Mock Performance] Tracked accuracy for ${predictionId}`);
  }

  async getModelMetrics(modelId: string): Promise<any> {
    return { accuracy: 0.95, f1Score: 0.92 };
  }

  async recordGroundTruthFromWorkOrder(
    workOrderId: string,
    assetId: string,
    actualFailure: boolean,
    failureType?: string,
  ): Promise<void> {
    console.log(
      `[Mock Performance] Recorded ground truth for WO ${workOrderId}: ${actualFailure}`,
    );
  }

  async calculateMetrics(
    modelName: string,
    windowSize: number = 30,
  ): Promise<any> {
    return {
      modelName,
      windowSize,
      accuracy: 0.95,
      precision: 0.94,
      recall: 0.93,
      f1Score: 0.935,
      timestamp: new Date(),
    };
  }

  async getMetricsHistory(
    modelName: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any[]> {
    return [
      { timestamp: new Date(), accuracy: 0.95 },
      { timestamp: new Date(Date.now() - 86400000), accuracy: 0.94 },
    ];
  }

  async compareModelVersions(
    modelName: string,
    versionA: string,
    versionB: string,
  ): Promise<any> {
    return {
      modelName,
      versionA,
      versionB,
      comparison: { accuracyDiff: 0.01 },
    };
  }

  async getActiveAlerts(modelName?: string): Promise<any[]> {
    return [];
  }

  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    console.log(`[Mock Performance] Acknowledged alert ${alertId}`);
  }

  async getPredictionAccuracyByRisk(modelName: string): Promise<any> {
    return { high: 0.9, medium: 0.85, low: 0.95 };
  }

  async getPredictionStats(modelName: string): Promise<any> {
    return { total: 100, correct: 95 };
  }

  async evaluateOverduePredictions(): Promise<any> {
    console.log("[Mock Performance] Evaluating overdue predictions");
    return { evaluated: 10, updated: 5 };
  }
}
