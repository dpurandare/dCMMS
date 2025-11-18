import { Injectable, Logger, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import axios from 'axios';
import { FeastFeatureService } from './feast-feature.service';

export interface PredictionRequest {
  modelName: string;
  assetIds: string[];
  useCache?: boolean;
}

export interface AssetPrediction {
  assetId: string;
  failureProbability: number;
  riskLevel: 'low' | 'medium' | 'high';
  predicted: boolean;
  confidence?: number;
  features?: Record<string, any>;
}

export interface PredictionResponse {
  predictions: AssetPrediction[];
  modelName: string;
  modelVersion?: string;
  timestamp: Date;
  latencyMs: number;
}

export interface PredictionLog {
  assetId: string;
  modelName: string;
  modelVersion: string;
  failureProbability: number;
  predicted: boolean;
  features: Record<string, any>;
  timestamp: Date;
}

@Injectable()
export class MLInferenceService {
  private readonly logger = new Logger(MLInferenceService.name);
  private readonly modelServerHost = process.env.MODEL_SERVER_HOST || 'localhost';
  private readonly modelServerPort = process.env.MODEL_SERVER_PORT || 8080;
  private readonly feastService: FeastFeatureService;

  // In-memory prediction cache (in production, use Redis)
  private predictionCache: Map<string, { prediction: AssetPrediction; timestamp: Date }> = new Map();
  private readonly cacheTTL = 300000; // 5 minutes

  // Prediction logs (in production, write to database/time-series DB)
  private predictionLogs: PredictionLog[] = [];

  constructor() {
    this.feastService = new FeastFeatureService();
  }

  /**
   * Batch prediction for multiple assets
   */
  async batchPredict(request: PredictionRequest): Promise<PredictionResponse> {
    const startTime = Date.now();
    this.logger.log(`Batch prediction for ${request.assetIds.length} assets`);

    try {
      // Step 1: Fetch features from Feast
      const features = await this.fetchFeaturesFromFeast(request.assetIds);

      // Step 2: Call model server for inference
      const modelResponse = await this.callModelServer(request.modelName, features);

      // Step 3: Format predictions
      const predictions = this.formatPredictions(
        request.assetIds,
        modelResponse.predictions,
        modelResponse.probabilities,
        features
      );

      // Step 4: Cache predictions
      if (request.useCache !== false) {
        this.cachePredictions(predictions);
      }

      // Step 5: Log predictions
      this.logPredictions(predictions, request.modelName, modelResponse.model_version);

      const latencyMs = Date.now() - startTime;

      this.logger.log(`Batch prediction completed in ${latencyMs}ms`);

      return {
        predictions,
        modelName: request.modelName,
        modelVersion: modelResponse.model_version,
        timestamp: new Date(),
        latencyMs,
      };
    } catch (error) {
      this.logger.error(`Batch prediction failed: ${error.message}`);
      throw new ServiceUnavailableException(`Prediction failed: ${error.message}`);
    }
  }

  /**
   * Single asset prediction with caching
   */
  async predictSingle(modelName: string, assetId: string, useCache: boolean = true): Promise<AssetPrediction> {
    // Check cache
    if (useCache) {
      const cached = this.getCachedPrediction(assetId);
      if (cached) {
        this.logger.log(`Using cached prediction for ${assetId}`);
        return cached;
      }
    }

    // Predict using batch API (batch of 1)
    const response = await this.batchPredict({
      modelName,
      assetIds: [assetId],
      useCache,
    });

    return response.predictions[0];
  }

  /**
   * Get predictions for all assets with risk filtering
   */
  async predictAllAssets(
    modelName: string,
    riskLevelFilter?: 'low' | 'medium' | 'high'
  ): Promise<PredictionResponse> {
    // In production, fetch asset IDs from database
    // For now, we'll use a placeholder
    const assetIds = await this.getAllAssetIds();

    const response = await this.batchPredict({
      modelName,
      assetIds,
      useCache: true,
    });

    // Filter by risk level if requested
    if (riskLevelFilter) {
      response.predictions = response.predictions.filter(
        (p) => p.riskLevel === riskLevelFilter
      );
    }

    return response;
  }

  /**
   * Get prediction logs for drift monitoring
   */
  getPredictionLogs(limit: number = 1000): PredictionLog[] {
    return this.predictionLogs.slice(-limit);
  }

  /**
   * Clear prediction cache
   */
  clearCache(): void {
    this.predictionCache.clear();
    this.logger.log('Prediction cache cleared');
  }

  // ===== Private Methods =====

  /**
   * Fetch features from Feast
   */
  private async fetchFeaturesFromFeast(assetIds: string[]): Promise<Record<string, any>[]> {
    this.logger.log(`Fetching features for ${assetIds.length} assets from Feast`);

    try {
      const features = await this.feastService.getOnlineFeatures({
        features: [
          'asset_features:health_score',
          'asset_features:asset_age_months',
          'asset_features:days_since_last_maintenance',
          'asset_features:recent_alarms_30d',
          'asset_features:mttr_hours',
          'asset_features:mtbf_hours',
          'asset_features:wo_rate_per_month',
          'asset_features:corrective_wo_ratio',
          'asset_features:maintenance_health_ratio',
          'asset_features:alarm_rate_30d',
          // Telemetry features
          'telemetry_features:rolling_avg_power_7d',
          'telemetry_features:rolling_std_power_7d',
          'telemetry_features:rolling_avg_temperature_7d',
          'telemetry_features:capacity_factor_30d',
          'telemetry_features:degradation_rate_365d',
        ],
        entities: {
          asset_id: assetIds,
        },
      });

      // Convert to array of feature objects
      const featureArrays = features.feature_values;
      const featureNames = features.feature_names;

      const result: Record<string, any>[] = [];

      for (let i = 0; i < assetIds.length; i++) {
        const assetFeatures: Record<string, any> = {
          asset_id: assetIds[i],
        };

        for (let j = 0; j < featureNames.length; j++) {
          assetFeatures[featureNames[j]] = featureArrays[j][i];
        }

        result.push(assetFeatures);
      }

      return result;
    } catch (error) {
      this.logger.error(`Feast feature fetch failed: ${error.message}`);

      // Fallback: use default features
      this.logger.warn('Using default features as fallback');
      return assetIds.map((assetId) => this.getDefaultFeatures(assetId));
    }
  }

  /**
   * Call model server for inference
   */
  private async callModelServer(
    modelName: string,
    features: Record<string, any>[]
  ): Promise<{ predictions: number[]; probabilities: number[][]; model_version: string }> {
    const url = `http://${this.modelServerHost}:${this.modelServerPort}/v1/models/${modelName}:predict`;

    this.logger.log(`Calling model server: ${url}`);

    try {
      // Convert features to instances (2D array)
      const instances = features.map((f) => {
        // Extract feature values in correct order (excluding asset_id)
        const { asset_id, ...featureValues } = f;
        return Object.values(featureValues);
      });

      const response = await axios.post(
        url,
        { instances },
        {
          timeout: 10000, // 10 second timeout
          headers: { 'Content-Type': 'application/json' },
        }
      );

      return {
        predictions: response.data.predictions || [],
        probabilities: response.data.probabilities || [],
        model_version: response.data.model_version || 'unknown',
      };
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error(`Model server not available: ${url}`);
      }

      throw new Error(`Model server error: ${error.message}`);
    }
  }

  /**
   * Format predictions with risk levels
   */
  private formatPredictions(
    assetIds: string[],
    predictions: number[],
    probabilities: number[][],
    features: Record<string, any>[]
  ): AssetPrediction[] {
    return assetIds.map((assetId, index) => {
      const predicted = predictions[index] === 1;
      const failureProbability = probabilities[index] ? probabilities[index][1] : predictions[index];

      // Determine risk level based on probability
      let riskLevel: 'low' | 'medium' | 'high';
      if (failureProbability >= 0.7) {
        riskLevel = 'high';
      } else if (failureProbability >= 0.4) {
        riskLevel = 'medium';
      } else {
        riskLevel = 'low';
      }

      return {
        assetId,
        failureProbability,
        riskLevel,
        predicted,
        features: features[index],
      };
    });
  }

  /**
   * Cache predictions
   */
  private cachePredictions(predictions: AssetPrediction[]): void {
    const now = new Date();

    for (const prediction of predictions) {
      this.predictionCache.set(prediction.assetId, {
        prediction,
        timestamp: now,
      });
    }

    // Clean expired cache entries
    this.cleanExpiredCache();
  }

  /**
   * Get cached prediction
   */
  private getCachedPrediction(assetId: string): AssetPrediction | null {
    const cached = this.predictionCache.get(assetId);

    if (!cached) {
      return null;
    }

    // Check if cache is still valid
    const age = Date.now() - cached.timestamp.getTime();
    if (age > this.cacheTTL) {
      this.predictionCache.delete(assetId);
      return null;
    }

    return cached.prediction;
  }

  /**
   * Clean expired cache entries
   */
  private cleanExpiredCache(): void {
    const now = Date.now();

    for (const [assetId, cached] of this.predictionCache.entries()) {
      const age = now - cached.timestamp.getTime();
      if (age > this.cacheTTL) {
        this.predictionCache.delete(assetId);
      }
    }
  }

  /**
   * Log predictions for drift monitoring
   */
  private logPredictions(
    predictions: AssetPrediction[],
    modelName: string,
    modelVersion: string
  ): void {
    const now = new Date();

    for (const prediction of predictions) {
      this.predictionLogs.push({
        assetId: prediction.assetId,
        modelName,
        modelVersion,
        failureProbability: prediction.failureProbability,
        predicted: prediction.predicted,
        features: prediction.features || {},
        timestamp: now,
      });
    }

    // Keep only last 10000 logs in memory
    if (this.predictionLogs.length > 10000) {
      this.predictionLogs = this.predictionLogs.slice(-10000);
    }
  }

  /**
   * Get all asset IDs (placeholder - in production, query from database)
   */
  private async getAllAssetIds(): Promise<string[]> {
    // TODO: Query from database
    // For now, return placeholder asset IDs
    return ['asset_1', 'asset_2', 'asset_3', 'asset_4', 'asset_5'];
  }

  /**
   * Get default features (fallback when Feast unavailable)
   */
  private getDefaultFeatures(assetId: string): Record<string, any> {
    return {
      asset_id: assetId,
      health_score: 70.0,
      asset_age_months: 24,
      days_since_last_maintenance: 30,
      recent_alarms_30d: 3,
      mttr_hours: 10.0,
      mtbf_hours: 720.0,
      wo_rate_per_month: 1.0,
      corrective_wo_ratio: 0.3,
      maintenance_health_ratio: 0.43,
      alarm_rate_30d: 0.1,
      rolling_avg_power_7d: 95.0,
      rolling_std_power_7d: 5.0,
      rolling_avg_temperature_7d: 25.0,
      capacity_factor_30d: 0.85,
      degradation_rate_365d: -0.02,
    };
  }
}
