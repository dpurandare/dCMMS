/**
 * ML Explainability Service
 *
 * Mock implementation for development/build without external dependencies.
 */

export class MLExplainabilityService {
  constructor() {
    console.log("ML Explainability Service initialized (Mock Provider)");
  }

  async getExplanation(modelName: string, assetId: string): Promise<any> {
    return {
      modelName,
      assetId,
      features: [
        { name: "temperature", contribution: 0.4 },
        { name: "vibration", contribution: 0.3 },
      ],
      topFeatures: [
        { feature: "temperature", contribution: 0.4 },
        { feature: "vibration", contribution: 0.3 },
      ],
      timestamp: new Date(),
    };
  }

  async explainPrediction(params: {
    modelName: string;
    assetId: string;
  }): Promise<any> {
    return this.getExplanation(params.modelName, params.assetId);
  }

  getRecommendation(explanation: any): string {
    return "Check temperature sensor and vibration levels.";
  }

  async getWaterfallData(modelName: string, assetId: string): Promise<any> {
    return {
      baseValue: 0.5,
      features: [
        { name: "temperature", value: 0.2 },
        { name: "pressure", value: -0.1 },
      ],
      finalValue: 0.6,
    };
  }

  async getFeatureImportance(
    modelName: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    return [
      { feature: "temperature", importance: 0.35 },
      { feature: "vibration", importance: 0.25 },
      { feature: "pressure", importance: 0.2 },
    ];
  }
}
