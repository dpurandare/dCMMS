/**
 * ML Inference Service
 *
 * Mock implementation for development/build without external dependencies.
 */

export interface AssetPrediction {
  assetId: string;
  prediction: number;
  risk: string;
  failureProbability?: number; // Added for compatibility
  confidence?: number; // Added for compatibility
}

export interface PredictionResult {
  modelName: string;
  assetId: string;
  prediction: number;
  confidence: number;
  timestamp: Date;
  cached: boolean;
}

export interface PredictionLog {
  id: string;
  timestamp: Date;
  model: string;
  result: string;
}

export class MLInferenceService {
  constructor() {
    console.log("ML Inference Service initialized (Mock Provider)");
  }

  async predictSingle(
    modelName: string,
    assetId: string,
    useCache: boolean = true,
  ): Promise<PredictionResult> {
    return {
      modelName,
      assetId,
      prediction: 0.85,
      confidence: 0.92,
      timestamp: new Date(),
      cached: useCache,
    };
  }

  async predictAllAssets(
    _modelName: string,
    _riskLevel?: string,
  ): Promise<AssetPrediction[]> {
    return [
      {
        assetId: "asset-1",
        prediction: 0.9,
        risk: "high",
        failureProbability: 0.9,
        confidence: 0.95,
      },
      {
        assetId: "asset-2",
        prediction: 0.2,
        risk: "low",
        failureProbability: 0.2,
        confidence: 0.98,
      },
    ];
  }

  getPredictionLogs(_limit: number): PredictionLog[] {
    return [
      {
        id: "log-1",
        timestamp: new Date(),
        model: "model-1",
        result: "success",
      },
      {
        id: "log-2",
        timestamp: new Date(),
        model: "model-1",
        result: "success",
      },
    ];
  }

  clearCache(): void {
    console.log("[Mock Inference] Cache cleared");
  }
}
