/**
 * Model Performance Service
 *
 * Mock implementation for development/build without external dependencies.
 */

export interface ModelMetrics {
  accuracy: number;
  f1Score: number;
  modelName?: string;
  windowSize?: number;
  precision?: number;
  recall?: number;
  timestamp?: Date;
}

export interface PerformanceHistory {
  timestamp: Date;
  accuracy: number;
}

export interface ModelComparison {
  modelName: string;
  versionA: string;
  versionB: string;
  comparison: {
    accuracyDiff: number;
  };
}

export interface RiskAccuracy {
  high: number;
  medium: number;
  low: number;
}

export interface PredictionStats {
  total: number;
  correct: number;
}

export interface OverdueEvaluation {
  evaluated: number;
  updated: number;
}

export class ModelPerformanceService {
  constructor() {
    console.log("Model Performance Service initialized (Mock Provider)");
  }

  async trackPredictionAccuracy(
    predictionId: string,
    _actualValue: number,
  ): Promise<void> {
    console.log(`[Mock Performance] Tracked accuracy for ${predictionId}`);
  }

  async getModelMetrics(_modelId: string): Promise<ModelMetrics> {
    return { accuracy: 0.95, f1Score: 0.92 };
  }

  async recordGroundTruthFromWorkOrder(
    workOrderId: string,
    _assetId: string,
    actualFailure: boolean,
    _failureType?: string,
  ): Promise<void> {
    console.log(
      `[Mock Performance] Recorded ground truth for WO ${workOrderId}: ${actualFailure}`,
    );
  }

  async calculateMetrics(
    modelName: string,
    windowSize: number = 30,
  ): Promise<ModelMetrics> {
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
    _modelName: string,
    _startDate?: Date,
    _endDate?: Date,
  ): Promise<PerformanceHistory[]> {
    return [
      { timestamp: new Date(), accuracy: 0.95 },
      { timestamp: new Date(Date.now() - 86400000), accuracy: 0.94 },
    ];
  }

  async compareModelVersions(
    modelName: string,
    versionA: string,
    versionB: string,
  ): Promise<ModelComparison> {
    return {
      modelName,
      versionA,
      versionB,
      comparison: { accuracyDiff: 0.01 },
    };
  }

  async getActiveAlerts(_modelName?: string): Promise<unknown[]> {
    return [];
  }

  async acknowledgeAlert(alertId: string, _userId: string): Promise<void> {
    console.log(`[Mock Performance] Acknowledged alert ${alertId}`);
  }

  async getPredictionAccuracyByRisk(_modelName: string): Promise<RiskAccuracy> {
    return { high: 0.9, medium: 0.85, low: 0.95 };
  }

  async getPredictionStats(_modelName: string): Promise<PredictionStats> {
    return { total: 100, correct: 95 };
  }

  async evaluateOverduePredictions(): Promise<OverdueEvaluation> {
    console.log("[Mock Performance] Evaluating overdue predictions");
    return { evaluated: 10, updated: 5 };
  }
}
