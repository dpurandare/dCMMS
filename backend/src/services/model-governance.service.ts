/**
 * Model Governance Service
 *
 * Mock implementation for development/build without external dependencies.
 */

export type ModelStage =
  | "development"
  | "staging"
  | "review"
  | "production"
  | "retired";

export interface ModelDocumentation {
  modelId: string;
  [key: string]: unknown;
}

export interface Model {
  id: string;
  modelName: string;
  version: string;
  description: string;
  owner: string;
  stage: ModelStage | string;
  updatedBy?: string;
  updatedAt?: Date;
  retiredBy?: string;
  reason?: string;
  retiredAt?: Date;
}

export interface ApprovalRequest {
  id: string;
  modelId: string;
  requestedBy: string;
  approvers: string[];
  status: "pending" | "approved" | "rejected";
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  reason?: string;
  rejectedAt?: Date;
}

export interface ChecklistItem {
  modelId: string;
  itemId: string;
  completed: boolean;
  completedBy: string;
  evidence?: string;
  notes?: string;
  updatedAt: Date;
}

export interface Incident {
  id: string;
  modelId?: string; // Optional because updateIncident doesn't return modelId in mock
  severity?: string;
  type?: string;
  description?: string;
  impact?: string;
  reportedBy?: string;
  status: string;
  resolution?: string;
  resolvedBy?: string;
  actionsTaken?: string[];
  updatedAt?: Date;
}

export class ModelGovernanceService {
  constructor() {
    console.log("Model Governance Service initialized (Mock Provider)");
  }

  async registerModel(
    modelName: string,
    version: string,
    description: string,
    owner: string,
  ): Promise<Model> {
    return {
      id: "mock-model-id",
      modelName,
      version,
      description,
      owner,
      stage: "development",
    };
  }

  async updateModelStage(
    modelId: string,
    newStage: ModelStage,
    updatedBy: string,
  ): Promise<Partial<Model>> {
    return { id: modelId, stage: newStage, updatedBy, updatedAt: new Date() };
  }

  async requestApproval(
    modelId: string,
    requestedBy: string,
    approvers: string[],
  ): Promise<ApprovalRequest> {
    return {
      id: "mock-approval-id",
      modelId,
      requestedBy,
      approvers,
      status: "pending",
    };
  }

  async approveModel(
    modelId: string,
    approvedBy: string,
  ): Promise<ApprovalRequest> {
    return {
      id: "mock-approval-id",
      modelId,
      approvedBy,
      status: "approved",
      approvedAt: new Date(),
      requestedBy: "mock-user",
      approvers: ["admin"],
    };
  }

  async rejectModel(
    modelId: string,
    rejectedBy: string,
    reason: string,
  ): Promise<ApprovalRequest> {
    return {
      id: "mock-approval-id",
      modelId,
      rejectedBy,
      reason,
      status: "rejected",
      rejectedAt: new Date(),
      requestedBy: "mock-user",
      approvers: ["admin"],
    };
  }

  async updateChecklistItem(
    modelId: string,
    itemId: string,
    completed: boolean,
    completedBy: string,
    evidence?: string,
    notes?: string,
  ): Promise<ChecklistItem> {
    return {
      modelId,
      itemId,
      completed,
      completedBy,
      evidence,
      notes,
      updatedAt: new Date(),
    };
  }

  async addDocumentation(
    doc: ModelDocumentation,
  ): Promise<ModelDocumentation & { id: string; createdAt: Date }> {
    return { ...doc, id: "mock-doc-id", createdAt: new Date() };
  }

  async getDocumentation(
    modelId: string,
  ): Promise<{ modelId: string; content: string; lastUpdated: Date }> {
    return { modelId, content: "Mock documentation", lastUpdated: new Date() };
  }

  async retireModel(
    modelId: string,
    retiredBy: string,
    reason: string,
    replacementModelId?: string,
    dataRetentionPolicy?: string,
  ): Promise<Partial<Model>> {
    return {
      id: modelId,
      stage: "retired",
      retiredBy,
      reason,
      retiredAt: new Date(),
    };
  }

  async reportIncident(
    modelId: string,
    severity: string,
    type: string,
    description: string,
    impact: string,
    reportedBy: string,
  ): Promise<Incident> {
    return {
      id: "mock-incident-id",
      modelId,
      severity,
      type,
      description,
      impact,
      reportedBy,
      status: "open",
    };
  }

  async updateIncident(
    incidentId: string,
    status: string,
    resolution?: string,
    resolvedBy?: string,
    actionsTaken?: string[],
  ): Promise<Incident> {
    return {
      id: incidentId,
      status,
      resolution,
      resolvedBy,
      actionsTaken,
      updatedAt: new Date(),
    };
  }

  async getModelsByStage(stage: ModelStage): Promise<Partial<Model>[]> {
    return [
      { id: "mock-model-1", modelName: "Model 1", stage },
      { id: "mock-model-2", modelName: "Model 2", stage },
    ];
  }
}
