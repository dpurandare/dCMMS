import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';

const execAsync = promisify(exec);

export interface ModelDeploymentConfig {
  modelName: string;
  modelVersion: string;
  modelUri: string;
  replicas?: number;
  minReplicas?: number;
  maxReplicas?: number;
  canaryPercent?: number;
  resources?: {
    requests?: {
      cpu?: string;
      memory?: string;
    };
    limits?: {
      cpu?: string;
      memory?: string;
    };
  };
}

export interface DeploymentStatus {
  modelName: string;
  modelVersion: string;
  status: 'deploying' | 'ready' | 'failed' | 'not_found';
  replicas: number;
  availableReplicas: number;
  url?: string;
  health?: {
    liveness: boolean;
    readiness: boolean;
  };
  lastUpdated: Date;
}

@Injectable()
export class MLDeploymentService {
  private readonly logger = new Logger(MLDeploymentService.name);
  private readonly modelServerPort = process.env.MODEL_SERVER_PORT || 8080;
  private readonly modelServerHost = process.env.MODEL_SERVER_HOST || 'localhost';
  private readonly mlflowTrackingUri = process.env.MLFLOW_TRACKING_URI || 'http://localhost:5000';

  // In-memory deployment registry (in production, use database)
  private deployments: Map<string, DeploymentStatus> = new Map();

  /**
   * Deploy model to serving infrastructure
   */
  async deployModel(config: ModelDeploymentConfig): Promise<DeploymentStatus> {
    this.logger.log(`Deploying model: ${config.modelName} v${config.modelVersion}`);

    // Validate model exists in MLflow
    await this.validateModelInMLflow(config.modelUri);

    // Check if model is already deployed
    const existing = this.deployments.get(config.modelName);
    if (existing && existing.status === 'ready') {
      this.logger.warn(`Model ${config.modelName} is already deployed`);
      // Update existing deployment
      return await this.updateDeployment(config);
    }

    // Create deployment status
    const deployment: DeploymentStatus = {
      modelName: config.modelName,
      modelVersion: config.modelVersion,
      status: 'deploying',
      replicas: config.replicas || 1,
      availableReplicas: 0,
      url: `http://${this.modelServerHost}:${this.modelServerPort}/v1/models/${config.modelName}`,
      lastUpdated: new Date(),
    };

    this.deployments.set(config.modelName, deployment);

    try {
      // Deploy model server (local or Kubernetes)
      if (process.env.USE_KUBERNETES === 'true') {
        await this.deployToKubernetes(config);
      } else {
        await this.deployLocally(config);
      }

      // Wait for deployment to be ready
      await this.waitForDeploymentReady(config.modelName);

      // Update status
      deployment.status = 'ready';
      deployment.availableReplicas = deployment.replicas;
      deployment.lastUpdated = new Date();

      this.deployments.set(config.modelName, deployment);

      this.logger.log(`Model deployed successfully: ${config.modelName}`);

      return deployment;
    } catch (error) {
      this.logger.error(`Deployment failed: ${error.message}`);

      deployment.status = 'failed';
      deployment.lastUpdated = new Date();
      this.deployments.set(config.modelName, deployment);

      throw new BadRequestException(`Failed to deploy model: ${error.message}`);
    }
  }

  /**
   * Get deployment status
   */
  async getDeploymentStatus(modelName: string): Promise<DeploymentStatus> {
    const deployment = this.deployments.get(modelName);

    if (!deployment) {
      throw new NotFoundException(`Model ${modelName} not found`);
    }

    // Update health status
    try {
      const health = await this.checkModelHealth(modelName);
      deployment.health = health;
    } catch (error) {
      this.logger.warn(`Health check failed for ${modelName}: ${error.message}`);
      deployment.health = { liveness: false, readiness: false };
    }

    return deployment;
  }

  /**
   * Undeploy model
   */
  async undeployModel(modelName: string): Promise<void> {
    this.logger.log(`Undeploying model: ${modelName}`);

    const deployment = this.deployments.get(modelName);

    if (!deployment) {
      throw new NotFoundException(`Model ${modelName} not deployed`);
    }

    try {
      if (process.env.USE_KUBERNETES === 'true') {
        await this.undeployFromKubernetes(modelName);
      } else {
        await this.undeployLocally(modelName);
      }

      // Remove from registry
      this.deployments.delete(modelName);

      this.logger.log(`Model undeployed successfully: ${modelName}`);
    } catch (error) {
      this.logger.error(`Undeploy failed: ${error.message}`);
      throw new BadRequestException(`Failed to undeploy model: ${error.message}`);
    }
  }

  /**
   * Rollback to previous version
   */
  async rollbackModel(modelName: string): Promise<DeploymentStatus> {
    this.logger.log(`Rolling back model: ${modelName}`);

    const deployment = this.deployments.get(modelName);

    if (!deployment) {
      throw new NotFoundException(`Model ${modelName} not deployed`);
    }

    // In production, this would fetch previous version from deployment history
    // For now, we'll simulate by keeping track of previous version
    const previousVersion = this.getPreviousVersion(deployment.modelVersion);

    const rollbackConfig: ModelDeploymentConfig = {
      modelName,
      modelVersion: previousVersion,
      modelUri: `models:/${modelName}/${previousVersion}`,
    };

    return await this.deployModel(rollbackConfig);
  }

  /**
   * List all deployments
   */
  async listDeployments(): Promise<DeploymentStatus[]> {
    return Array.from(this.deployments.values());
  }

  // ===== Private Methods =====

  /**
   * Validate model exists in MLflow
   */
  private async validateModelInMLflow(modelUri: string): Promise<void> {
    try {
      const response = await axios.get(`${this.mlflowTrackingUri}/api/2.0/mlflow/registered-models/get`, {
        params: { name: modelUri.split('/')[1] }, // Extract model name from URI
      });

      if (!response.data) {
        throw new Error('Model not found in MLflow');
      }
    } catch (error) {
      throw new BadRequestException(`Model validation failed: ${error.message}`);
    }
  }

  /**
   * Deploy to Kubernetes using kubectl
   */
  private async deployToKubernetes(config: ModelDeploymentConfig): Promise<void> {
    this.logger.log('Deploying to Kubernetes...');

    // Generate InferenceService manifest
    const manifest = this.generateInferenceServiceManifest(config);

    // Apply manifest
    const { stdout, stderr } = await execAsync(`kubectl apply -f - <<EOF\n${manifest}\nEOF`);

    if (stderr && !stderr.includes('configured')) {
      throw new Error(`kubectl apply failed: ${stderr}`);
    }

    this.logger.log('Kubernetes deployment initiated');
  }

  /**
   * Deploy locally using Python model server
   */
  private async deployLocally(config: ModelDeploymentConfig): Promise<void> {
    this.logger.log('Deploying locally...');

    const pythonPath = process.env.PYTHON_PATH || 'python3';
    const serverPath = process.env.MODEL_SERVER_PATH || '/home/user/dCMMS/ml/serving/model_server.py';

    const command = `${pythonPath} ${serverPath} \
      --model-uri "${config.modelUri}" \
      --model-name "${config.modelName}" \
      --model-version "${config.modelVersion}" \
      --port ${this.modelServerPort} &`;

    const { stdout, stderr } = await execAsync(command);

    if (stderr) {
      this.logger.warn(`Deployment warning: ${stderr}`);
    }

    this.logger.log('Local deployment initiated');
  }

  /**
   * Undeploy from Kubernetes
   */
  private async undeployFromKubernetes(modelName: string): Promise<void> {
    this.logger.log('Undeploying from Kubernetes...');

    const { stdout, stderr } = await execAsync(
      `kubectl delete inferenceservice ${modelName} -n dcmms-ml`
    );

    if (stderr && !stderr.includes('deleted')) {
      throw new Error(`kubectl delete failed: ${stderr}`);
    }

    this.logger.log('Kubernetes undeploy complete');
  }

  /**
   * Undeploy locally
   */
  private async undeployLocally(modelName: string): Promise<void> {
    this.logger.log('Undeploying locally...');

    // Find and kill the process (simplified - in production use process manager like PM2)
    try {
      const { stdout } = await execAsync(`pgrep -f "model_server.py.*${modelName}"`);
      const pid = stdout.trim();

      if (pid) {
        await execAsync(`kill ${pid}`);
        this.logger.log(`Killed process ${pid}`);
      }
    } catch (error) {
      this.logger.warn(`Could not find process to kill: ${error.message}`);
    }
  }

  /**
   * Wait for deployment to be ready
   */
  private async waitForDeploymentReady(modelName: string, timeoutMs: number = 300000): Promise<void> {
    const startTime = Date.now();
    const checkInterval = 5000; // 5 seconds

    while (Date.now() - startTime < timeoutMs) {
      try {
        const health = await this.checkModelHealth(modelName);

        if (health.liveness && health.readiness) {
          this.logger.log(`Deployment ready: ${modelName}`);
          return;
        }
      } catch (error) {
        // Not ready yet, continue waiting
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    throw new Error(`Deployment timeout: ${modelName} not ready within ${timeoutMs}ms`);
  }

  /**
   * Check model health
   */
  private async checkModelHealth(modelName: string): Promise<{ liveness: boolean; readiness: boolean }> {
    const url = `http://${this.modelServerHost}:${this.modelServerPort}`;

    try {
      const [livenessResponse, readinessResponse] = await Promise.all([
        axios.get(`${url}/health/live`, { timeout: 5000 }),
        axios.get(`${url}/health/ready`, { timeout: 5000 }),
      ]);

      return {
        liveness: livenessResponse.status === 200,
        readiness: readinessResponse.status === 200,
      };
    } catch (error) {
      return { liveness: false, readiness: false };
    }
  }

  /**
   * Update existing deployment
   */
  private async updateDeployment(config: ModelDeploymentConfig): Promise<DeploymentStatus> {
    this.logger.log(`Updating deployment: ${config.modelName}`);

    // For local deployment, we'll restart the server
    // For Kubernetes, we'll update the InferenceService

    if (process.env.USE_KUBERNETES === 'true') {
      await this.deployToKubernetes(config);
    } else {
      // Stop existing
      await this.undeployLocally(config.modelName);
      // Start new
      await this.deployLocally(config);
    }

    // Update deployment status
    const deployment = this.deployments.get(config.modelName)!;
    deployment.modelVersion = config.modelVersion;
    deployment.lastUpdated = new Date();

    return deployment;
  }

  /**
   * Generate Kubernetes InferenceService manifest
   */
  private generateInferenceServiceManifest(config: ModelDeploymentConfig): string {
    const minReplicas = config.minReplicas || 1;
    const maxReplicas = config.maxReplicas || 5;

    return `
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: ${config.modelName}
  namespace: dcmms-ml
  annotations:
    autoscaling.knative.dev/minScale: "${minReplicas}"
    autoscaling.knative.dev/maxScale: "${maxReplicas}"
spec:
  predictor:
    model:
      modelFormat:
        name: mlflow
      storageUri: ${config.modelUri}
      resources:
        requests:
          cpu: "${config.resources?.requests?.cpu || '1'}"
          memory: "${config.resources?.requests?.memory || '2Gi'}"
        limits:
          cpu: "${config.resources?.limits?.cpu || '2'}"
          memory: "${config.resources?.limits?.memory || '4Gi'}"
`;
  }

  /**
   * Get previous version (simplified - in production, query from deployment history)
   */
  private getPreviousVersion(currentVersion: string): string {
    // Simple version decrement
    const versionNum = parseInt(currentVersion);
    if (!isNaN(versionNum) && versionNum > 1) {
      return (versionNum - 1).toString();
    }

    // Default to "Production" stage
    return 'Production';
  }
}
