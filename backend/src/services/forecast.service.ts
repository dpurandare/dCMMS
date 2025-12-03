import { db } from '../db';
import { generationForecasts, forecastAccuracyMetrics, weatherForecasts, assets, sites, windTurbineMetadata } from '../db/schema';
import { eq, and, gte, lte, desc, sql, isNotNull } from 'drizzle-orm';
import axios from 'axios';

// ==========================================
// Types & Interfaces
// ==========================================

export interface GenerationForecast {
  id: string;
  siteId: string;
  assetId?: string;
  forecastTimestamp: Date;
  forecastHorizonHours: number;
  generatedAt: Date;

  // Model info
  modelName: string;
  modelVersion: string;
  algorithm: string;

  // Predictions
  predictedGenerationMw: number;
  confidenceIntervalLowerMw?: number;
  confidenceIntervalUpperMw?: number;
  predictionStdDev?: number;

  // Actual values (filled later)
  actualGenerationMw?: number;
  errorMw?: number;
  absoluteErrorMw?: number;
  percentageError?: number;

  // Metadata
  weatherForecastId?: string;
  featureValues?: any;
  modelAccuracyScore?: number;
  trainingDataEndDate?: Date;
  isActive: boolean;
  accuracyValidated: boolean;
}

export interface ForecastRequest {
  siteId: string;
  assetId?: string;
  forecastHorizonHours: number; // 24 or 48
  modelType?: 'arima' | 'sarima' | 'prophet'; // Default: 'sarima'
  energyType?: 'solar' | 'wind'; // Auto-detect from site/asset if not provided
}

export interface ForecastAccuracyMetric {
  id: string;
  modelName: string;
  modelVersion: string;
  siteId: string;
  periodStart: Date;
  periodEnd: Date;
  forecastHorizonHours: number;

  // Accuracy metrics
  meanAbsoluteErrorMw?: number;
  meanAbsolutePercentageError?: number;
  rootMeanSquaredErrorMw?: number;
  rSquared?: number;
  forecastSkillScore?: number;

  numForecasts: number;
  numValidated: number;
}

// ==========================================
// Forecast Service
// ==========================================

export class ForecastService {
  private mlServiceUrl: string;

  constructor() {
    this.mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8001';
  }

  // ==========================================
  // Forecast Generation
  // ==========================================

  /**
   * Generate power generation forecast using ML models
   */
  async generateForecast(request: ForecastRequest): Promise<GenerationForecast[]> {
    const { siteId, assetId, forecastHorizonHours, modelType = 'sarima', energyType } = request;

    // Determine energy type if not provided
    const detectedEnergyType = energyType || await this.detectEnergyType(siteId, assetId);

    // Get weather forecast for the site
    const weatherForecast = await this.getWeatherForecastForSite(siteId, forecastHorizonHours);

    // Call ML service to generate forecast
    const mlForecast = await this.callMLForecastService({
      siteId,
      assetId,
      energyType: detectedEnergyType,
      modelType,
      forecastHorizonHours,
      weatherForecast,
    });

    // Save forecasts to database
    const savedForecasts: GenerationForecast[] = [];

    for (let i = 0; i < mlForecast.forecast.length; i++) {
      const forecastTimestamp = new Date();
      forecastTimestamp.setHours(forecastTimestamp.getHours() + i + 1);

      const forecast: Partial<GenerationForecast> = {
        siteId,
        assetId,
        forecastTimestamp,
        forecastHorizonHours: i + 1, // Hours ahead
        generatedAt: new Date(),

        modelName: mlForecast.model_name,
        modelVersion: mlForecast.model_version,
        algorithm: mlForecast.algorithm,

        predictedGenerationMw: mlForecast.forecast[i],
        confidenceIntervalLowerMw: mlForecast.lower_bound[i],
        confidenceIntervalUpperMw: mlForecast.upper_bound[i],
        predictionStdDev: mlForecast.std_dev[i],

        weatherForecastId: weatherForecast[i]?.id,
        featureValues: mlForecast.feature_values?.[i],
        modelAccuracyScore: mlForecast.model_accuracy_score,
        trainingDataEndDate: mlForecast.training_data_end_date ? new Date(mlForecast.training_data_end_date) : undefined,

        isActive: true,
        accuracyValidated: false,
      };

      const [saved] = await db.insert(generationForecasts).values(forecast as any).returning();
      savedForecasts.push({
        ...saved,
        predictedGenerationMw: parseFloat(saved.predictedGenerationMw.toString()),
        confidenceIntervalLowerMw: saved.confidenceIntervalLowerMw ? parseFloat(saved.confidenceIntervalLowerMw.toString()) : undefined,
        confidenceIntervalUpperMw: saved.confidenceIntervalUpperMw ? parseFloat(saved.confidenceIntervalUpperMw.toString()) : undefined,
        predictionStdDev: saved.predictionStdDev ? parseFloat(saved.predictionStdDev.toString()) : undefined,
        actualGenerationMw: saved.actualGenerationMw ? parseFloat(saved.actualGenerationMw.toString()) : undefined,
        errorMw: saved.errorMw ? parseFloat(saved.errorMw.toString()) : undefined,
        absoluteErrorMw: saved.absoluteErrorMw ? parseFloat(saved.absoluteErrorMw.toString()) : undefined,
        percentageError: saved.percentageError ? parseFloat(saved.percentageError.toString()) : undefined,
        modelAccuracyScore: saved.modelAccuracyScore ? parseFloat(saved.modelAccuracyScore.toString()) : undefined,
      } as GenerationForecast);
    }

    // Mark old forecasts for the same timestamp as inactive
    await this.deactivateOldForecasts(siteId, assetId);

    return savedForecasts;
  }

  /**
   * Get existing forecasts for a site/asset
   */
  async getForecasts(
    siteId: string,
    assetId?: string,
    startDate?: Date,
    endDate?: Date,
    activeOnly: boolean = true
  ): Promise<GenerationForecast[]> {
    const conditions = [eq(generationForecasts.siteId, siteId)];

    if (assetId) {
      conditions.push(eq(generationForecasts.assetId, assetId));
    }

    if (startDate) {
      conditions.push(gte(generationForecasts.forecastTimestamp, startDate));
    }

    if (endDate) {
      conditions.push(lte(generationForecasts.forecastTimestamp, endDate));
    }

    if (activeOnly) {
      conditions.push(eq(generationForecasts.isActive, true));
    }

    const results = await db
      .select()
      .from(generationForecasts)
      .where(and(...conditions))
      .orderBy(desc(generationForecasts.forecastTimestamp));

    return results.map(f => ({
      ...f,
      predictedGenerationMw: parseFloat(f.predictedGenerationMw.toString()),
      confidenceIntervalLowerMw: f.confidenceIntervalLowerMw ? parseFloat(f.confidenceIntervalLowerMw.toString()) : undefined,
      confidenceIntervalUpperMw: f.confidenceIntervalUpperMw ? parseFloat(f.confidenceIntervalUpperMw.toString()) : undefined,
      predictionStdDev: f.predictionStdDev ? parseFloat(f.predictionStdDev.toString()) : undefined,
      actualGenerationMw: f.actualGenerationMw ? parseFloat(f.actualGenerationMw.toString()) : undefined,
      errorMw: f.errorMw ? parseFloat(f.errorMw.toString()) : undefined,
      absoluteErrorMw: f.absoluteErrorMw ? parseFloat(f.absoluteErrorMw.toString()) : undefined,
      percentageError: f.percentageError ? parseFloat(f.percentageError.toString()) : undefined,
      modelAccuracyScore: f.modelAccuracyScore ? parseFloat(f.modelAccuracyScore.toString()) : undefined,
    })) as GenerationForecast[];
  }

  /**
   * Update forecast with actual generation value
   */
  async updateActualGeneration(
    forecastId: string,
    actualGenerationMw: number
  ): Promise<void> {
    // Get forecast
    const [forecast] = await db
      .select()
      .from(generationForecasts)
      .where(eq(generationForecasts.id, forecastId));

    if (!forecast) {
      throw new Error('Forecast not found');
    }

    // Calculate errors
    const predicted = parseFloat(forecast.predictedGenerationMw.toString());
    const actual = actualGenerationMw;
    const error = actual - predicted;
    const absoluteError = Math.abs(error);
    const percentageError = (absoluteError / (actual + 1e-10)) * 100;

    // Update forecast
    await db
      .update(generationForecasts)
      .set({
        actualGenerationMw: actual.toString(),
        errorMw: error.toString(),
        absoluteErrorMw: absoluteError.toString(),
        percentageError: percentageError.toString(),
        accuracyValidated: true,
        updatedAt: new Date(),
      })
      .where(eq(generationForecasts.id, forecastId));
  }

  /**
   * Calculate accuracy metrics for a model over a time period
   */
  async calculateAccuracyMetrics(
    siteId: string,
    modelName: string,
    modelVersion: string,
    periodStart: Date,
    periodEnd: Date,
    forecastHorizonHours: number
  ): Promise<ForecastAccuracyMetric> {
    // Get all validated forecasts in the period
    const validatedForecasts = await db
      .select()
      .from(generationForecasts)
      .where(
        and(
          eq(generationForecasts.siteId, siteId),
          eq(generationForecasts.modelName, modelName),
          eq(generationForecasts.modelVersion, modelVersion),
          gte(generationForecasts.forecastTimestamp, new Date(periodStart)),
          lte(generationForecasts.forecastTimestamp, new Date(periodEnd)),
          isNotNull(generationForecasts.actualGenerationMw)
        )
      );

    if (validatedForecasts.length === 0) {
      throw new Error('No validated forecasts found for the specified period');
    }

    // Extract actual and predicted values
    const actual = validatedForecasts.map((f) => parseFloat(f.actualGenerationMw?.toString() || '0'));
    const predicted = validatedForecasts.map((f) => parseFloat(f.predictedGenerationMw.toString()));

    // Calculate metrics
    const mae = actual.reduce((sum, a, i) => sum + Math.abs(a - predicted[i]), 0) / actual.length;
    let mape = (actual.reduce((sum, a, i) => sum + Math.abs((a - predicted[i]) / (a + 1e-10)), 0) / actual.length) * 100;

    // Cap MAPE to avoid numeric overflow (max 999.99)
    if (mape > 999.99) mape = 999.99;
    const rmse = Math.sqrt(actual.reduce((sum, a, i) => sum + Math.pow(a - predicted[i], 2), 0) / actual.length);

    // R²
    const actualMean = actual.reduce((sum, a) => sum + a, 0) / actual.length;
    const ssRes = actual.reduce((sum, a, i) => sum + Math.pow(a - predicted[i], 2), 0);
    const ssTot = actual.reduce((sum, a) => sum + Math.pow(a - actualMean, 2), 0);
    let rSquared = ssTot > 1e-10 ? 1 - ssRes / ssTot : 0;

    // Cap R² to avoid overflow (range -9.9999 to 9.9999)
    if (rSquared < -9.9) rSquared = -9.9;
    if (rSquared > 9.9) rSquared = 9.9;

    // Forecast skill score (vs persistence model)
    let forecastSkill = 0;
    if (actual.length > 1) {
      const persistenceError = actual.slice(1).reduce((sum, a, i) => sum + Math.abs(a - actual[i]), 0) / (actual.length - 1);
      forecastSkill = persistenceError > 1e-10 ? 1 - mae / persistenceError : 0;
    }

    // Cap Skill Score
    if (forecastSkill < -9.9) forecastSkill = -9.9;
    if (forecastSkill > 9.9) forecastSkill = 9.9;

    // Save metrics
    const metrics: Partial<ForecastAccuracyMetric> = {
      modelName,
      modelVersion,
      siteId,
      periodStart,
      periodEnd,
      forecastHorizonHours,

      meanAbsoluteErrorMw: mae,
      meanAbsolutePercentageError: mape,
      rootMeanSquaredErrorMw: rmse,
      rSquared,
      forecastSkillScore: forecastSkill,

      numForecasts: validatedForecasts.length,
      numValidated: validatedForecasts.length,
    };

    const [saved] = await db.insert(forecastAccuracyMetrics).values(metrics as any).returning();

    return {
      ...saved,
      meanAbsoluteErrorMw: saved.meanAbsoluteErrorMw ? parseFloat(saved.meanAbsoluteErrorMw.toString()) : undefined,
      meanAbsolutePercentageError: saved.meanAbsolutePercentageError ? parseFloat(saved.meanAbsolutePercentageError.toString()) : undefined,
      rootMeanSquaredErrorMw: saved.rootMeanSquaredErrorMw ? parseFloat(saved.rootMeanSquaredErrorMw.toString()) : undefined,
      rSquared: saved.rSquared ? parseFloat(saved.rSquared.toString()) : undefined,
      forecastSkillScore: saved.forecastSkillScore ? parseFloat(saved.forecastSkillScore.toString()) : undefined,
    } as ForecastAccuracyMetric;
  }

  // ==========================================
  // Helper Methods
  // ==========================================

  /**
   * Detect energy type (solar or wind) from site/asset metadata
   */
  private async detectEnergyType(siteId: string, assetId?: string): Promise<'solar' | 'wind'> {
    // Check asset metadata first (more specific)
    if (assetId) {
      const [asset] = await db
        .select()
        .from(assets)
        .where(eq(assets.id, assetId));

      if (asset) {
        // Check if asset has wind turbine metadata
        const [windTurbine] = await db
          .select()
          .from(windTurbineMetadata)
          .where(eq(windTurbineMetadata.assetId, assetId));

        if (windTurbine) {
          return 'wind';
        }

        // Check asset metadata JSON
        if (asset.metadata) {
          try {
            const metadata = typeof asset.metadata === 'string'
              ? JSON.parse(asset.metadata)
              : asset.metadata;
            if (metadata.energyType) {
              return metadata.energyType as 'solar' | 'wind';
            }
          } catch (e) {
            // Invalid JSON, continue
          }
        }

        // Infer from asset type
        if (asset.type) {
          const type = asset.type.toLowerCase();
          if (type.includes('wind') || type.includes('turbine')) {
            return 'wind';
          }
          if (type.includes('solar') || type.includes('panel') || type.includes('inverter')) {
            return 'solar';
          }
        }
      }
    }

    // Check site config
    const [site] = await db
      .select()
      .from(sites)
      .where(eq(sites.id, siteId));

    if (site) {
      // Check energyType field (preferred method)
      if (site.energyType) {
        return site.energyType as 'solar' | 'wind';
      }

      // Check site config JSON (legacy)
      if (site.config) {
        try {
          const config = typeof site.config === 'string'
            ? JSON.parse(site.config)
            : site.config;
          if (config.energyType) {
            return config.energyType as 'solar' | 'wind';
          }
        } catch (e) {
          // Invalid JSON, continue
        }
      }

      // Infer from site type
      if (site.type) {
        const type = site.type.toLowerCase();
        if (type.includes('wind')) {
          return 'wind';
        }
        if (type.includes('solar')) {
          return 'solar';
        }
      }

      // Check if site has any wind turbines
      const [windAsset] = await db
        .select()
        .from(assets)
        .innerJoin(windTurbineMetadata, eq(assets.id, windTurbineMetadata.assetId))
        .where(eq(assets.siteId, siteId))
        .limit(1);

      if (windAsset) {
        return 'wind';
      }
    }

    // Last resort: Throw error instead of defaulting to solar
    throw new Error(
      `Unable to determine energy type for site ${siteId}${assetId ? ` and asset ${assetId}` : ''}. ` +
      `Please specify energyType parameter in the request, or update site/asset configuration with energyType.`
    );
  }

  /**
   * Get weather forecast for a site
   */
  private async getWeatherForecastForSite(siteId: string, hours: number): Promise<any[]> {
    const now = new Date();
    const endTime = new Date(now.getTime() + hours * 60 * 60 * 1000);

    const forecasts = await db
      .select()
      .from(weatherForecasts)
      .where(
        and(
          eq(weatherForecasts.siteId, siteId),
          gte(weatherForecasts.forecastTimestamp, now),
          lte(weatherForecasts.forecastTimestamp, endTime),
          eq(weatherForecasts.forecastType, 'forecast')
        )
      )
      .orderBy(weatherForecasts.forecastTimestamp);

    return forecasts;
  }

  /**
   * Call ML service to generate forecast
   */
  private async callMLForecastService(params: any): Promise<any> {
    try {
      const response = await axios.post(`${this.mlServiceUrl}/api/v1/forecast/generate`, params);
      return response.data;
    } catch (error) {
      console.error('Error calling ML forecast service:', error);

      // Fallback: Return mock forecast for development
      const mockForecast = this.generateMockForecast(params.forecastHorizonHours, params.energyType, params.modelType);
      return mockForecast;
    }
  }

  /**
   * Generate mock forecast for testing (when ML service is unavailable)
   */
  private generateMockForecast(hours: number, energyType: 'solar' | 'wind', modelType: string = 'mock'): any {
    const forecast = [];
    const lowerBound = [];
    const upperBound = [];
    const stdDev = [];

    for (let i = 0; i < hours; i++) {
      let value = 0;

      if (energyType === 'solar') {
        // Solar: Peak at noon, zero at night with realistic daily pattern
        const hour = (new Date().getHours() + i) % 24;
        const solarRadiation = Math.max(0, Math.sin((hour - 6) * Math.PI / 12));
        // Add some cloud cover variation
        const cloudFactor = 0.8 + Math.random() * 0.2;
        value = 10 * solarRadiation * cloudFactor;
      } else {
        // Wind: Weibull distribution for realistic wind patterns
        // Typical parameters: k=2.0 (shape), lambda=8.0 (scale in m/s)
        const windSpeed = this.weibullRandom(2.0, 8.0);

        // Wind power curve: P = 0.5 * ρ * A * v³ * Cp
        // Simplified cubic relationship with cut-in, rated, and cut-out speeds
        const cutInSpeed = 3.0;  // m/s
        const ratedSpeed = 12.5; // m/s
        const cutOutSpeed = 25.0; // m/s
        const ratedPower = 10.0; // MW

        if (windSpeed < cutInSpeed || windSpeed > cutOutSpeed) {
          value = 0;
        } else if (windSpeed >= ratedSpeed) {
          value = ratedPower;
        } else {
          // Cubic power curve between cut-in and rated
          value = ratedPower * Math.pow((windSpeed - cutInSpeed) / (ratedSpeed - cutInSpeed), 3);
        }

        // Add some turbulence variation
        value *= (0.95 + Math.random() * 0.1);
      }

      forecast.push(value);
      lowerBound.push(value * 0.85);
      upperBound.push(value * 1.15);
      stdDev.push(value * 0.075);
    }

    return {
      forecast,
      lower_bound: lowerBound,
      upper_bound: upperBound,
      std_dev: stdDev,
      model_name: modelType,
      model_version: 'v1.0',
      algorithm: 'MOCK',
      model_accuracy_score: 0.85,
      training_data_end_date: new Date().toISOString(),
    };
  }

  /**
   * Generate random value from Weibull distribution
   * Used for realistic wind speed modeling
   */
  private weibullRandom(k: number, lambda: number): number {
    // k = shape parameter (2.0 is typical for wind)
    // lambda = scale parameter (average wind speed)
    const u = Math.random();
    return lambda * Math.pow(-Math.log(1 - u), 1 / k);
  }

  /**
   * Deactivate old forecasts for the same site/asset
   */
  private async deactivateOldForecasts(siteId: string, assetId?: string): Promise<void> {
    const conditions = [
      eq(generationForecasts.siteId, siteId),
      eq(generationForecasts.isActive, true),
      lte(generationForecasts.generatedAt, sql`NOW() - INTERVAL '1 day'`),
    ];

    if (assetId) {
      conditions.push(eq(generationForecasts.assetId, assetId));
    }

    await db
      .update(generationForecasts)
      .set({ isActive: false })
      .where(and(...conditions));
  }
}

// Export singleton instance
export const forecastService = new ForecastService();
