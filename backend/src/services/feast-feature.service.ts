import { FastifyInstance } from "fastify";
import { spawn, ChildProcess } from "child_process";
import axios from "axios";

export interface FeatureVector {
  assetId: string;
  features: Record<string, any>;
}

export interface FeatureRequest {
  featureNames: string[];
  entityIds: string[];
}

/**
 * Feast Feature Service
 * Integrates with Feast feature store for ML feature serving
 */
export class FeastFeatureService {
  private fastify: FastifyInstance;
  private feastServerUrl: string;
  private feastServerProcess?: ChildProcess;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    this.feastServerUrl =
      process.env.FEAST_SERVER_URL || "http://localhost:6566";
  }

  /**
   * Get online features from Feast
   */
  async getOnlineFeatures(
    featureViews: string[],
    entityIds: Record<string, string[]>,
  ): Promise<Record<string, any>[]> {
    try {
      const response = await axios.post(
        `${this.feastServerUrl}/get-online-features`,
        {
          features: featureViews,
          entities: entityIds,
        },
      );

      this.fastify.log.info(
        { featureViews, entityCount: Object.values(entityIds)[0]?.length },
        "Retrieved online features from Feast",
      );

      return response.data.results || [];
    } catch (error) {
      this.fastify.log.error(
        { error },
        "Failed to get online features from Feast",
      );
      throw new Error("Failed to retrieve features from Feast");
    }
  }

  /**
   * Get asset features for predictive maintenance
   */
  async getAssetFeatures(assetIds: string[]): Promise<FeatureVector[]> {
    const featureViews = [
      "asset_features:asset_type",
      "asset_features:asset_status",
      "asset_features:asset_age_months",
      "asset_features:total_work_orders",
      "asset_features:days_since_last_maintenance",
      "asset_features:mttr_hours",
      "asset_features:mtbf_hours",
      "asset_features:health_score",
      "asset_features:recent_alarms_30d",
      "telemetry_features:rolling_avg_power_7d",
      "telemetry_features:rolling_std_power_7d",
      "telemetry_features:anomaly_count_30d",
      "telemetry_features:capacity_factor_30d",
      "work_order_features:wo_count_30d",
      "work_order_features:corrective_wo_count_30d",
      "work_order_features:corrective_wo_ratio_30d",
    ];

    const entities = {
      asset_id: assetIds,
    };

    const results = await this.getOnlineFeatures(featureViews, entities);

    // Transform results to feature vectors
    return assetIds.map((assetId, index) => ({
      assetId,
      features: results[index] || {},
    }));
  }

  /**
   * Get feature statistics
   */
  async getFeatureStatistics(featureName: string): Promise<{
    mean: number;
    std: number;
    min: number;
    max: number;
    nullCount: number;
  }> {
    // Placeholder - in production, calculate from offline store
    this.fastify.log.warn(
      { featureName },
      "Feature statistics not implemented",
    );

    return {
      mean: 0,
      std: 0,
      min: 0,
      max: 0,
      nullCount: 0,
    };
  }

  /**
   * Check Feast server health
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.feastServerUrl}/health`, {
        timeout: 5000,
      });

      return response.status === 200;
    } catch (error) {
      this.fastify.log.warn({ error }, "Feast server health check failed");
      return false;
    }
  }

  /**
   * List available feature views
   */
  async listFeatureViews(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.feastServerUrl}/feature-views`);
      return response.data.feature_views || [];
    } catch (error) {
      this.fastify.log.error({ error }, "Failed to list feature views");
      return [];
    }
  }

  /**
   * Trigger feature materialization (calls Python script)
   */
  async triggerMaterialization(): Promise<void> {
    return new Promise((resolve, reject) => {
      const scriptPath =
        process.env.FEAST_MATERIALIZE_SCRIPT ||
        "../../../ml/feast/materialize_features.py";

      this.fastify.log.info("Triggering Feast feature materialization");

      const child = spawn("python3", [scriptPath], {
        cwd: __dirname,
        env: { ...process.env },
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data: Buffer) => {
        stdout += data.toString();
        this.fastify.log.info(
          { output: data.toString() },
          "Materialization output",
        );
      });

      child.stderr.on("data", (data: Buffer) => {
        stderr += data.toString();
        this.fastify.log.warn(
          { error: data.toString() },
          "Materialization warning",
        );
      });

      child.on("close", (code: number) => {
        if (code === 0) {
          this.fastify.log.info(
            "Feature materialization completed successfully",
          );
          resolve();
        } else {
          this.fastify.log.error(
            { code, stderr },
            "Feature materialization failed",
          );
          reject(new Error(`Materialization failed with code ${code}`));
        }
      });

      child.on("error", (error: Error) => {
        this.fastify.log.error(
          { error },
          "Failed to start materialization process",
        );
        reject(error);
      });
    });
  }

  /**
   * Start Feast feature server (for development)
   */
  async startFeatureServer(): Promise<void> {
    if (process.env.FEAST_SERVER_ENABLED !== "true") {
      this.fastify.log.info("Feast server disabled in environment");
      return;
    }

    const feastRepoPath = process.env.FEAST_REPO_PATH || "../../../ml/feast";

    this.fastify.log.info({ feastRepoPath }, "Starting Feast feature server");

    this.feastServerProcess = spawn(
      "feast",
      ["serve", "-h", "0.0.0.0", "-p", "6566"],
      {
        cwd: feastRepoPath,
        env: { ...process.env },
      },
    );

    this.feastServerProcess.stdout?.on("data", (data) => {
      this.fastify.log.info({ output: data.toString() }, "Feast server output");
    });

    this.feastServerProcess.stderr?.on("data", (data) => {
      this.fastify.log.warn({ error: data.toString() }, "Feast server warning");
    });

    this.feastServerProcess.on("close", (code) => {
      this.fastify.log.warn({ code }, "Feast server stopped");
    });

    // Wait for server to start
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const healthy = await this.checkHealth();
    if (healthy) {
      this.fastify.log.info("Feast feature server started successfully");
    } else {
      this.fastify.log.error("Feast feature server failed to start");
    }
  }

  /**
   * Stop Feast feature server
   */
  async stopFeatureServer(): Promise<void> {
    if (this.feastServerProcess) {
      this.feastServerProcess.kill("SIGTERM");
      this.fastify.log.info("Feast feature server stopped");
    }
  }
}

export function createFeastFeatureService(
  fastify: FastifyInstance,
): FeastFeatureService {
  return new FeastFeatureService(fastify);
}
