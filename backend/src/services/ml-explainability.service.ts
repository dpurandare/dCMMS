import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import axios from 'axios';
import { FeastFeatureService } from './feast-feature.service';

export interface ExplanationRequest {
  modelName: string;
  assetId: string;
  topN?: number;
}

export interface FeatureContribution {
  feature: string;
  value: number;
  shapValue: number;
  absShap: number;
}

export interface ExplanationResponse {
  assetId: string;
  prediction: number;
  probability: number;
  baseValue: number;
  topFeatures: FeatureContribution[];
  allFeatures?: FeatureContribution[];
  modelName: string;
  timestamp: Date;
  latencyMs: number;
}

export interface WaterfallData {
  assetId: string;
  baseValue: number;
  features: Array<{
    feature: string;
    value: number;
    shapValue: number;
  }>;
  finalValue: number;
}

@Injectable()
export class MLExplainabilityService {
  private readonly logger = new Logger(MLExplainabilityService.name);
  private readonly explainerHost = process.env.SHAP_EXPLAINER_HOST || 'localhost';
  private readonly explainerPort = process.env.SHAP_EXPLAINER_PORT || 8081;
  private readonly feastService: FeastFeatureService;

  // Cache explainers (in production, consider Redis)
  private explainerCache: Map<string, { createdAt: Date }> = new Map();

  constructor() {
    this.feastService = new FeastFeatureService();
  }

  /**
   * Get SHAP explanation for a single asset prediction
   */
  async explainPrediction(request: ExplanationRequest): Promise<ExplanationResponse> {
    this.logger.log(`Getting explanation for asset: ${request.assetId}`);

    try {
      // Step 1: Fetch features from Feast
      const features = await this.fetchFeaturesForAsset(request.assetId);

      // Step 2: Call SHAP explainer service
      const explanation = await this.callExplainerService(features, request.topN || 10);

      // Step 3: Format response
      return {
        assetId: request.assetId,
        prediction: explanation.prediction,
        probability: explanation.probability,
        baseValue: explanation.base_value,
        topFeatures: explanation.top_features.map((f: any) => ({
          feature: this.formatFeatureName(f.feature),
          value: f.value,
          shapValue: f.shap_value,
          absShap: f.abs_shap,
        })),
        allFeatures: explanation.all_features?.map((f: any) => ({
          feature: this.formatFeatureName(f.feature),
          value: f.value,
          shapValue: f.shap_value,
          absShap: f.abs_shap,
        })),
        modelName: request.modelName,
        timestamp: new Date(),
        latencyMs: explanation.latency_ms,
      };
    } catch (error) {
      this.logger.error(`Explanation failed: ${error.message}`);
      throw new ServiceUnavailableException(`Failed to generate explanation: ${error.message}`);
    }
  }

  /**
   * Get waterfall plot data for visualization
   */
  async getWaterfallData(modelName: string, assetId: string): Promise<WaterfallData> {
    this.logger.log(`Getting waterfall data for asset: ${assetId}`);

    try {
      // Fetch features
      const features = await this.fetchFeaturesForAsset(assetId);

      // Call waterfall endpoint
      const url = `http://${this.explainerHost}:${this.explainerPort}/waterfall`;

      const response = await axios.post(
        url,
        { features: [Object.values(features)] },
        { timeout: 5000 }
      );

      return {
        assetId,
        baseValue: response.data.base_value,
        features: response.data.features.map((f: any) => ({
          feature: this.formatFeatureName(f.feature),
          value: f.value,
          shapValue: f.shap_value,
        })),
        finalValue: response.data.final_value,
      };
    } catch (error) {
      this.logger.error(`Waterfall data failed: ${error.message}`);
      throw new ServiceUnavailableException(`Failed to get waterfall data: ${error.message}`);
    }
  }

  /**
   * Get feature importance summary across multiple predictions
   */
  async getFeatureImportance(modelName: string, assetIds: string[], topN: number = 10) {
    this.logger.log(`Getting feature importance for ${assetIds.length} assets`);

    try {
      // Fetch features for all assets
      const featuresArray = await Promise.all(
        assetIds.map((assetId) => this.fetchFeaturesForAsset(assetId))
      );

      // Call explainer service
      const featuresList = featuresArray.map((f) => Object.values(f));

      const explanation = await this.callExplainerService(featuresList, topN);

      return {
        topFeatures: explanation.top_features.map((f: any) => ({
          feature: this.formatFeatureName(f.feature),
          meanAbsShap: f.mean_abs_shap,
        })),
        numSamples: explanation.num_samples,
        modelName,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Feature importance failed: ${error.message}`);
      throw new ServiceUnavailableException(`Failed to get feature importance: ${error.message}`);
    }
  }

  /**
   * Get recommendation based on SHAP values
   */
  getRecommendation(explanation: ExplanationResponse): string {
    const topFeatures = explanation.topFeatures.slice(0, 3);

    const recommendations: string[] = [];

    for (const feature of topFeatures) {
      // Skip if contribution is negligible
      if (Math.abs(feature.shapValue) < 0.01) {
        continue;
      }

      if (feature.feature.includes('alarm')) {
        if (feature.shapValue > 0) {
          recommendations.push(`High alarm count detected (${feature.value.toFixed(0)}). Investigate alarm causes.`);
        }
      } else if (feature.feature.includes('health_score')) {
        if (feature.shapValue > 0 && feature.value < 60) {
          recommendations.push(`Low health score (${feature.value.toFixed(1)}). Schedule comprehensive inspection.`);
        }
      } else if (feature.feature.includes('temperature')) {
        if (feature.shapValue > 0 && feature.value > 30) {
          recommendations.push(`Elevated temperature (${feature.value.toFixed(1)}°C). Check cooling system.`);
        }
      } else if (feature.feature.includes('days_since_last_maintenance')) {
        if (feature.shapValue > 0 && feature.value > 90) {
          recommendations.push(`Overdue maintenance (${feature.value.toFixed(0)} days). Schedule preventive maintenance.`);
        }
      } else if (feature.feature.includes('degradation')) {
        if (feature.shapValue > 0) {
          recommendations.push(`Performance degradation detected. Consider component replacement.`);
        }
      }
    }

    if (recommendations.length === 0) {
      if (explanation.probability > 0.7) {
        recommendations.push('High failure risk. Schedule immediate inspection.');
      } else if (explanation.probability > 0.4) {
        recommendations.push('Moderate risk. Plan preventive maintenance within next week.');
      } else {
        recommendations.push('Low risk. Continue normal monitoring.');
      }
    }

    return recommendations.join(' ');
  }

  // ===== Private Methods =====

  /**
   * Fetch features for a single asset from Feast
   */
  private async fetchFeaturesForAsset(assetId: string): Promise<Record<string, number>> {
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
          'telemetry_features:rolling_avg_power_7d',
          'telemetry_features:rolling_std_power_7d',
          'telemetry_features:rolling_avg_temperature_7d',
          'telemetry_features:capacity_factor_30d',
          'telemetry_features:degradation_rate_365d',
        ],
        entities: {
          asset_id: [assetId],
        },
      });

      // Convert to object
      const featureObj: Record<string, number> = {};
      const featureNames = features.feature_names;
      const featureValues = features.feature_values;

      for (let i = 0; i < featureNames.length; i++) {
        featureObj[featureNames[i]] = featureValues[i][0]; // First element (single asset)
      }

      return featureObj;
    } catch (error) {
      this.logger.warn(`Feast feature fetch failed: ${error.message}. Using defaults.`);
      return this.getDefaultFeatures();
    }
  }

  /**
   * Call SHAP explainer service
   */
  private async callExplainerService(features: any, topN: number): Promise<any> {
    const url = `http://${this.explainerHost}:${this.explainerPort}/explain`;

    try {
      // Ensure features is an array
      const featuresArray = Array.isArray(features) ? features : [Object.values(features)];

      const response = await axios.post(
        url,
        {
          features: featuresArray,
          top_n: topN,
        },
        {
          timeout: 10000,
          headers: { 'Content-Type': 'application/json' },
        }
      );

      return response.data;
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error(`SHAP explainer service not available: ${url}`);
      }

      throw new Error(`Explainer service error: ${error.message}`);
    }
  }

  /**
   * Format feature name for display
   */
  private formatFeatureName(feature: string): string {
    // Remove prefix (e.g., "asset_features:health_score" -> "Health Score")
    const name = feature.split(':').pop() || feature;

    // Convert snake_case to Title Case
    return name
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get default features (fallback)
   */
  private getDefaultFeatures(): Record<string, number> {
    return {
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
