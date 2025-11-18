import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';

export type ModelStage = 'development' | 'staging' | 'review' | 'production' | 'retired';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'needs_changes';

export interface ModelRegistration {
  modelId: string;
  modelName: string;
  version: string;
  stage: ModelStage;
  description: string;
  owner: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModelApproval {
  modelId: string;
  modelName: string;
  version: string;
  requestedBy: string;
  requestedAt: Date;
  approvers: string[];
  status: ApprovalStatus;
  approvedBy?: string[];
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  checklistCompleted: boolean;
  checklistItems: ModelChecklistItem[];
}

export interface ModelChecklistItem {
  id: string;
  category: 'documentation' | 'performance' | 'testing' | 'security' | 'compliance' | 'deployment';
  description: string;
  required: boolean;
  completed: boolean;
  completedBy?: string;
  completedAt?: Date;
  evidence?: string;
  notes?: string;
}

export interface ModelDocumentation {
  modelId: string;
  modelName: string;
  version: string;
  description: string;
  owner: string;
  useCase: string;
  algorithm: string;
  features: string[];
  targetVariable: string;
  trainingDataset: {
    source: string;
    dateRange: { start: Date; end: Date };
    sampleSize: number;
  };
  performanceMetrics: {
    precision: number;
    recall: number;
    f1Score: number;
    accuracy: number;
    evaluationDate: Date;
  };
  limitations: string[];
  risks: string[];
  mitigations: string[];
  complianceNotes?: string;
  lastUpdated: Date;
}

export interface ModelRetirement {
  modelId: string;
  modelName: string;
  version: string;
  retiredBy: string;
  retiredAt: Date;
  reason: string;
  replacementModel?: {
    modelId: string;
    version: string;
  };
  dataRetentionPolicy: string;
  archiveLocation?: string;
}

export interface IncidentReport {
  incidentId: string;
  modelId: string;
  modelName: string;
  version: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'prediction_error' | 'performance_degradation' | 'bias' | 'security' | 'compliance' | 'other';
  description: string;
  impact: string;
  reportedBy: string;
  reportedAt: Date;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  resolution?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  actionsTaken: string[];
}

@Injectable()
export class ModelGovernanceService {
  private readonly logger = new Logger(ModelGovernanceService.name);

  // In-memory storage (in production, use database)
  private models: Map<string, ModelRegistration> = new Map();
  private approvals: Map<string, ModelApproval> = new Map();
  private documentation: Map<string, ModelDocumentation> = new Map();
  private retirements: Map<string, ModelRetirement> = new Map();
  private incidents: Map<string, IncidentReport> = new Map();

  /**
   * Register a new model
   */
  async registerModel(
    modelName: string,
    version: string,
    description: string,
    owner: string
  ): Promise<ModelRegistration> {
    this.logger.log(`Registering model: ${modelName} v${version}`);

    const modelId = `${modelName}_${version}`;

    if (this.models.has(modelId)) {
      throw new BadRequestException(`Model ${modelId} is already registered`);
    }

    const registration: ModelRegistration = {
      modelId,
      modelName,
      version,
      stage: 'development',
      description,
      owner,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.models.set(modelId, registration);

    this.logger.log(`Model ${modelId} registered successfully`);

    return registration;
  }

  /**
   * Update model stage
   */
  async updateModelStage(
    modelId: string,
    newStage: ModelStage,
    updatedBy: string
  ): Promise<ModelRegistration> {
    this.logger.log(`Updating model ${modelId} stage to: ${newStage}`);

    const model = this.models.get(modelId);

    if (!model) {
      throw new NotFoundException(`Model ${modelId} not found`);
    }

    // Validate stage transition
    this.validateStageTransition(model.stage, newStage);

    model.stage = newStage;
    model.updatedAt = new Date();

    this.models.set(modelId, model);

    this.logger.log(`Model ${modelId} stage updated to ${newStage}`);

    return model;
  }

  /**
   * Request approval for model promotion
   */
  async requestApproval(
    modelId: string,
    requestedBy: string,
    approvers: string[]
  ): Promise<ModelApproval> {
    this.logger.log(`Requesting approval for model: ${modelId}`);

    const model = this.models.get(modelId);

    if (!model) {
      throw new NotFoundException(`Model ${modelId} not found`);
    }

    if (model.stage !== 'staging' && model.stage !== 'review') {
      throw new BadRequestException(
        `Model must be in staging or review stage for approval (current: ${model.stage})`
      );
    }

    // Create approval request
    const approval: ModelApproval = {
      modelId,
      modelName: model.modelName,
      version: model.version,
      requestedBy,
      requestedAt: new Date(),
      approvers,
      status: 'pending',
      checklistCompleted: false,
      checklistItems: this.createApprovalChecklist(),
    };

    this.approvals.set(modelId, approval);

    // Update model stage to review
    if (model.stage === 'staging') {
      await this.updateModelStage(modelId, 'review', requestedBy);
    }

    this.logger.log(`Approval request created for ${modelId}`);

    return approval;
  }

  /**
   * Approve model for production
   */
  async approveModel(
    modelId: string,
    approvedBy: string
  ): Promise<ModelApproval> {
    this.logger.log(`Approving model: ${modelId} by ${approvedBy}`);

    const approval = this.approvals.get(modelId);

    if (!approval) {
      throw new NotFoundException(`Approval request for ${modelId} not found`);
    }

    if (!approval.approvers.includes(approvedBy)) {
      throw new BadRequestException(`User ${approvedBy} is not an approver for this model`);
    }

    if (!approval.checklistCompleted) {
      throw new BadRequestException('Model checklist must be completed before approval');
    }

    // Add to approved list
    approval.approvedBy = approval.approvedBy || [];
    if (!approval.approvedBy.includes(approvedBy)) {
      approval.approvedBy.push(approvedBy);
    }

    // Check if all approvers have approved
    if (approval.approvedBy.length >= approval.approvers.length) {
      approval.status = 'approved';
      approval.approvedAt = new Date();

      // Update model stage to production
      await this.updateModelStage(modelId, 'production', approvedBy);

      this.logger.log(`Model ${modelId} fully approved and promoted to production`);
    } else {
      this.logger.log(
        `Model ${modelId} partially approved (${approval.approvedBy.length}/${approval.approvers.length})`
      );
    }

    this.approvals.set(modelId, approval);

    return approval;
  }

  /**
   * Reject model approval
   */
  async rejectModel(
    modelId: string,
    rejectedBy: string,
    reason: string
  ): Promise<ModelApproval> {
    this.logger.log(`Rejecting model: ${modelId}`);

    const approval = this.approvals.get(modelId);

    if (!approval) {
      throw new NotFoundException(`Approval request for ${modelId} not found`);
    }

    if (!approval.approvers.includes(rejectedBy)) {
      throw new BadRequestException(`User ${rejectedBy} is not an approver for this model`);
    }

    approval.status = 'rejected';
    approval.rejectedBy = rejectedBy;
    approval.rejectedAt = new Date();
    approval.rejectionReason = reason;

    this.approvals.set(modelId, approval);

    // Revert model to staging
    await this.updateModelStage(modelId, 'staging', rejectedBy);

    this.logger.log(`Model ${modelId} rejected: ${reason}`);

    return approval;
  }

  /**
   * Update checklist item
   */
  async updateChecklistItem(
    modelId: string,
    itemId: string,
    completed: boolean,
    completedBy: string,
    evidence?: string,
    notes?: string
  ): Promise<ModelApproval> {
    const approval = this.approvals.get(modelId);

    if (!approval) {
      throw new NotFoundException(`Approval request for ${modelId} not found`);
    }

    const item = approval.checklistItems.find((i) => i.id === itemId);

    if (!item) {
      throw new NotFoundException(`Checklist item ${itemId} not found`);
    }

    item.completed = completed;
    item.completedBy = completedBy;
    item.completedAt = completed ? new Date() : undefined;
    item.evidence = evidence;
    item.notes = notes;

    // Check if all required items are completed
    const allRequiredCompleted = approval.checklistItems
      .filter((i) => i.required)
      .every((i) => i.completed);

    approval.checklistCompleted = allRequiredCompleted;

    this.approvals.set(modelId, approval);

    return approval;
  }

  /**
   * Add model documentation
   */
  async addDocumentation(doc: ModelDocumentation): Promise<ModelDocumentation> {
    this.logger.log(`Adding documentation for model: ${doc.modelId}`);

    this.documentation.set(doc.modelId, doc);

    return doc;
  }

  /**
   * Get model documentation
   */
  async getDocumentation(modelId: string): Promise<ModelDocumentation> {
    const doc = this.documentation.get(modelId);

    if (!doc) {
      throw new NotFoundException(`Documentation for ${modelId} not found`);
    }

    return doc;
  }

  /**
   * Retire a model
   */
  async retireModel(
    modelId: string,
    retiredBy: string,
    reason: string,
    replacementModelId?: string,
    dataRetentionPolicy: string = '90 days'
  ): Promise<ModelRetirement> {
    this.logger.log(`Retiring model: ${modelId}`);

    const model = this.models.get(modelId);

    if (!model) {
      throw new NotFoundException(`Model ${modelId} not found`);
    }

    const retirement: ModelRetirement = {
      modelId,
      modelName: model.modelName,
      version: model.version,
      retiredBy,
      retiredAt: new Date(),
      reason,
      replacementModel: replacementModelId
        ? {
            modelId: replacementModelId,
            version: this.models.get(replacementModelId)?.version || 'unknown',
          }
        : undefined,
      dataRetentionPolicy,
      archiveLocation: `/archives/models/${modelId}`,
    };

    this.retirements.set(modelId, retirement);

    // Update model stage to retired
    await this.updateModelStage(modelId, 'retired', retiredBy);

    this.logger.log(`Model ${modelId} retired successfully`);

    return retirement;
  }

  /**
   * Report an incident
   */
  async reportIncident(
    modelId: string,
    severity: IncidentReport['severity'],
    type: IncidentReport['type'],
    description: string,
    impact: string,
    reportedBy: string
  ): Promise<IncidentReport> {
    this.logger.log(`Reporting incident for model: ${modelId}`);

    const model = this.models.get(modelId);

    if (!model) {
      throw new NotFoundException(`Model ${modelId} not found`);
    }

    const incidentId = `incident_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const incident: IncidentReport = {
      incidentId,
      modelId,
      modelName: model.modelName,
      version: model.version,
      severity,
      type,
      description,
      impact,
      reportedBy,
      reportedAt: new Date(),
      status: 'open',
      actionsTaken: [],
    };

    this.incidents.set(incidentId, incident);

    this.logger.warn(
      `Incident ${incidentId} reported for model ${modelId}: [${severity}] ${type}`
    );

    // Send alert for critical incidents
    if (severity === 'critical' || severity === 'high') {
      await this.sendIncidentAlert(incident);
    }

    return incident;
  }

  /**
   * Update incident status
   */
  async updateIncident(
    incidentId: string,
    status: IncidentReport['status'],
    resolution?: string,
    resolvedBy?: string,
    actionsTaken?: string[]
  ): Promise<IncidentReport> {
    const incident = this.incidents.get(incidentId);

    if (!incident) {
      throw new NotFoundException(`Incident ${incidentId} not found`);
    }

    incident.status = status;

    if (status === 'resolved' || status === 'closed') {
      incident.resolution = resolution;
      incident.resolvedBy = resolvedBy;
      incident.resolvedAt = new Date();
    }

    if (actionsTaken) {
      incident.actionsTaken.push(...actionsTaken);
    }

    this.incidents.set(incidentId, incident);

    this.logger.log(`Incident ${incidentId} updated to status: ${status}`);

    return incident;
  }

  /**
   * Get all models by stage
   */
  async getModelsByStage(stage: ModelStage): Promise<ModelRegistration[]> {
    return Array.from(this.models.values()).filter((m) => m.stage === stage);
  }

  /**
   * Get pending approvals
   */
  async getPendingApprovals(): Promise<ModelApproval[]> {
    return Array.from(this.approvals.values()).filter((a) => a.status === 'pending');
  }

  /**
   * Get open incidents
   */
  async getOpenIncidents(severity?: IncidentReport['severity']): Promise<IncidentReport[]> {
    let incidents = Array.from(this.incidents.values()).filter(
      (i) => i.status === 'open' || i.status === 'investigating'
    );

    if (severity) {
      incidents = incidents.filter((i) => i.severity === severity);
    }

    return incidents.sort((a, b) => b.reportedAt.getTime() - a.reportedAt.getTime());
  }

  /**
   * Get model audit trail
   */
  async getModelAuditTrail(modelId: string): Promise<{
    registration: ModelRegistration;
    approvals: ModelApproval[];
    documentation?: ModelDocumentation;
    retirement?: ModelRetirement;
    incidents: IncidentReport[];
  }> {
    const registration = this.models.get(modelId);

    if (!registration) {
      throw new NotFoundException(`Model ${modelId} not found`);
    }

    const approvals = Array.from(this.approvals.values()).filter(
      (a) => a.modelId === modelId
    );

    const documentation = this.documentation.get(modelId);
    const retirement = this.retirements.get(modelId);
    const incidents = Array.from(this.incidents.values()).filter(
      (i) => i.modelId === modelId
    );

    return {
      registration,
      approvals,
      documentation,
      retirement,
      incidents,
    };
  }

  // ===== Private Methods =====

  /**
   * Validate stage transition
   */
  private validateStageTransition(currentStage: ModelStage, newStage: ModelStage): void {
    const validTransitions: Record<ModelStage, ModelStage[]> = {
      development: ['staging', 'retired'],
      staging: ['review', 'development', 'retired'],
      review: ['production', 'staging', 'retired'],
      production: ['retired'],
      retired: [], // No transitions from retired
    };

    if (!validTransitions[currentStage].includes(newStage)) {
      throw new BadRequestException(
        `Invalid stage transition: ${currentStage} → ${newStage}`
      );
    }
  }

  /**
   * Create approval checklist
   */
  private createApprovalChecklist(): ModelChecklistItem[] {
    return [
      // Documentation
      {
        id: 'doc_model_card',
        category: 'documentation',
        description: 'Model card/documentation completed',
        required: true,
        completed: false,
      },
      {
        id: 'doc_use_case',
        category: 'documentation',
        description: 'Use case and business value documented',
        required: true,
        completed: false,
      },
      {
        id: 'doc_limitations',
        category: 'documentation',
        description: 'Model limitations and risks documented',
        required: true,
        completed: false,
      },

      // Performance
      {
        id: 'perf_metrics',
        category: 'performance',
        description: 'Performance metrics meet requirements (F1 > 0.7)',
        required: true,
        completed: false,
      },
      {
        id: 'perf_comparison',
        category: 'performance',
        description: 'Comparison with baseline/previous model completed',
        required: true,
        completed: false,
      },

      // Testing
      {
        id: 'test_validation',
        category: 'testing',
        description: 'Validation on held-out test set completed',
        required: true,
        completed: false,
      },
      {
        id: 'test_edge_cases',
        category: 'testing',
        description: 'Edge cases and failure modes tested',
        required: true,
        completed: false,
      },
      {
        id: 'test_bias',
        category: 'testing',
        description: 'Bias and fairness testing completed',
        required: false,
        completed: false,
      },

      // Security
      {
        id: 'sec_data_privacy',
        category: 'security',
        description: 'Data privacy review completed',
        required: true,
        completed: false,
      },
      {
        id: 'sec_adversarial',
        category: 'security',
        description: 'Adversarial robustness tested',
        required: false,
        completed: false,
      },

      // Compliance
      {
        id: 'comp_ai_act',
        category: 'compliance',
        description: 'EU AI Act compliance verified (if applicable)',
        required: false,
        completed: false,
      },
      {
        id: 'comp_nist',
        category: 'compliance',
        description: 'NIST AI RMF alignment verified',
        required: false,
        completed: false,
      },

      // Deployment
      {
        id: 'deploy_resources',
        category: 'deployment',
        description: 'Resource requirements documented',
        required: true,
        completed: false,
      },
      {
        id: 'deploy_monitoring',
        category: 'deployment',
        description: 'Monitoring and alerting configured',
        required: true,
        completed: false,
      },
      {
        id: 'deploy_rollback',
        category: 'deployment',
        description: 'Rollback plan documented',
        required: true,
        completed: false,
      },
    ];
  }

  /**
   * Send incident alert
   */
  private async sendIncidentAlert(incident: IncidentReport): Promise<void> {
    // TODO: Integrate with alerting system
    this.logger.warn(
      `[INCIDENT ALERT] ${incident.severity.toUpperCase()}: ${incident.type} - ${incident.description}`
    );

    // Send to:
    // - Model owner
    // - ML team
    // - PagerDuty (for critical)
  }
}
