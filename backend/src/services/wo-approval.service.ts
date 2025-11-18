import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ModelPerformanceService } from './model-performance.service';

export interface ApprovalRequest {
  workOrderId: string;
  approvedBy: string;
  comments?: string;
}

export interface RejectionRequest {
  workOrderId: string;
  rejectedBy: string;
  reason: string;
  feedback?: string;
}

export interface ApprovalStats {
  totalPredictiveWOs: number;
  approved: number;
  rejected: number;
  pending: number;
  approvalRate: number;
  avgApprovalTimeHours: number;
  rejectionReasons: Record<string, number>;
}

export interface WorkOrderApproval {
  workOrderId: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  rejectedBy?: string;
  approvalDate?: Date;
  rejectionDate?: Date;
  comments?: string;
  rejectionReason?: string;
  feedback?: string;
}

@Injectable()
export class WorkOrderApprovalService {
  private readonly logger = new Logger(WorkOrderApprovalService.name);
  private readonly performanceService: ModelPerformanceService;

  // In-memory storage (in production, use database)
  private approvals: Map<string, WorkOrderApproval> = new Map();
  private rejectionFeedback: Array<{
    workOrderId: string;
    reason: string;
    feedback: string;
    timestamp: Date;
  }> = [];

  constructor() {
    this.performanceService = new ModelPerformanceService();
  }

  /**
   * Approve a predictive work order
   */
  async approveWorkOrder(request: ApprovalRequest): Promise<WorkOrderApproval> {
    this.logger.log(`Approving work order: ${request.workOrderId}`);

    // Validate work order exists
    const workOrder = await this.getWorkOrder(request.workOrderId);

    if (!workOrder) {
      throw new NotFoundException(`Work order ${request.workOrderId} not found`);
    }

    // Check if already approved or rejected
    const existing = this.approvals.get(request.workOrderId);
    if (existing && existing.status !== 'pending') {
      throw new BadRequestException(
        `Work order already ${existing.status}`
      );
    }

    // Create approval
    const approval: WorkOrderApproval = {
      workOrderId: request.workOrderId,
      status: 'approved',
      approvedBy: request.approvedBy,
      approvalDate: new Date(),
      comments: request.comments,
    };

    this.approvals.set(request.workOrderId, approval);

    // Update work order status to "scheduled"
    await this.updateWorkOrderStatus(request.workOrderId, 'scheduled');

    // Assign technician (in production, use work order assignment logic)
    await this.assignTechnician(request.workOrderId);

    // Send notification to assigned technician
    await this.notifyTechnician(request.workOrderId);

    this.logger.log(`Work order ${request.workOrderId} approved by ${request.approvedBy}`);

    return approval;
  }

  /**
   * Reject a predictive work order with feedback
   */
  async rejectWorkOrder(request: RejectionRequest): Promise<WorkOrderApproval> {
    this.logger.log(`Rejecting work order: ${request.workOrderId}`);

    // Validate work order exists
    const workOrder = await this.getWorkOrder(request.workOrderId);

    if (!workOrder) {
      throw new NotFoundException(`Work order ${request.workOrderId} not found`);
    }

    // Check if already approved or rejected
    const existing = this.approvals.get(request.workOrderId);
    if (existing && existing.status !== 'pending') {
      throw new BadRequestException(
        `Work order already ${existing.status}`
      );
    }

    // Create rejection
    const approval: WorkOrderApproval = {
      workOrderId: request.workOrderId,
      status: 'rejected',
      rejectedBy: request.rejectedBy,
      rejectionDate: new Date(),
      rejectionReason: request.reason,
      feedback: request.feedback,
    };

    this.approvals.set(request.workOrderId, approval);

    // Store feedback for ML team review
    this.rejectionFeedback.push({
      workOrderId: request.workOrderId,
      reason: request.reason,
      feedback: request.feedback || '',
      timestamp: new Date(),
    });

    // Update work order status to "canceled"
    await this.updateWorkOrderStatus(request.workOrderId, 'canceled');

    // Log rejection reason for model improvement
    await this.logRejectionForModelImprovement(request);

    // Notify ML team of rejection (optional)
    await this.notifyMLTeam(request);

    this.logger.log(`Work order ${request.workOrderId} rejected by ${request.rejectedBy}`);

    return approval;
  }

  /**
   * Batch approve multiple work orders
   */
  async batchApprove(
    workOrderIds: string[],
    approvedBy: string,
    comments?: string
  ): Promise<{ approved: number; failed: number; errors: string[] }> {
    this.logger.log(`Batch approving ${workOrderIds.length} work orders`);

    let approved = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const workOrderId of workOrderIds) {
      try {
        await this.approveWorkOrder({
          workOrderId,
          approvedBy,
          comments,
        });
        approved++;
      } catch (error) {
        failed++;
        errors.push(`${workOrderId}: ${error.message}`);
        this.logger.error(`Failed to approve ${workOrderId}: ${error.message}`);
      }
    }

    this.logger.log(`Batch approval completed: ${approved} approved, ${failed} failed`);

    return { approved, failed, errors };
  }

  /**
   * Get approval status for a work order
   */
  async getApprovalStatus(workOrderId: string): Promise<WorkOrderApproval> {
    const approval = this.approvals.get(workOrderId);

    if (!approval) {
      return {
        workOrderId,
        status: 'pending',
      };
    }

    return approval;
  }

  /**
   * Get approval statistics
   */
  async getApprovalStats(startDate?: Date, endDate?: Date): Promise<ApprovalStats> {
    // In production, query from database
    const allApprovals = Array.from(this.approvals.values());

    // Filter by date range if provided
    let filteredApprovals = allApprovals;
    if (startDate || endDate) {
      filteredApprovals = allApprovals.filter((a) => {
        const date = a.approvalDate || a.rejectionDate;
        if (!date) return false;

        if (startDate && date < startDate) return false;
        if (endDate && date > endDate) return false;

        return true;
      });
    }

    const totalPredictiveWOs = filteredApprovals.length;
    const approved = filteredApprovals.filter((a) => a.status === 'approved').length;
    const rejected = filteredApprovals.filter((a) => a.status === 'rejected').length;
    const pending = filteredApprovals.filter((a) => a.status === 'pending').length;

    const approvalRate = totalPredictiveWOs > 0 ? (approved / totalPredictiveWOs) * 100 : 0;

    // Calculate average approval time
    const approvedItems = filteredApprovals.filter(
      (a) => a.status === 'approved' && a.approvalDate
    );
    let avgApprovalTimeHours = 0;
    if (approvedItems.length > 0) {
      // In production, calculate from WO creation time to approval time
      avgApprovalTimeHours = 12; // Placeholder
    }

    // Count rejection reasons
    const rejectionReasons: Record<string, number> = {};
    for (const item of filteredApprovals) {
      if (item.status === 'rejected' && item.rejectionReason) {
        rejectionReasons[item.rejectionReason] = (rejectionReasons[item.rejectionReason] || 0) + 1;
      }
    }

    return {
      totalPredictiveWOs,
      approved,
      rejected,
      pending,
      approvalRate,
      avgApprovalTimeHours,
      rejectionReasons,
    };
  }

  /**
   * Get rejection feedback for ML team review
   */
  async getRejectionFeedback(limit: number = 100) {
    return this.rejectionFeedback.slice(-limit);
  }

  /**
   * Record work order completion and ground truth (for predictive WOs)
   */
  async recordWorkOrderCompletion(
    workOrderId: string,
    assetId: string,
    failureOccurred: boolean,
    failureType?: string
  ): Promise<void> {
    this.logger.log(`Recording WO completion for ${workOrderId}: failure=${failureOccurred}`);

    try {
      // Record ground truth for model performance tracking
      await this.performanceService.recordGroundTruthFromWorkOrder(
        workOrderId,
        assetId,
        failureOccurred,
        failureType
      );

      this.logger.log(`Ground truth recorded for WO ${workOrderId}`);
    } catch (error) {
      this.logger.error(`Failed to record ground truth: ${error.message}`);
      // Don't throw - this is a non-critical operation
    }
  }

  // ===== Private Methods =====

  /**
   * Get work order (placeholder - in production, query database)
   */
  private async getWorkOrder(workOrderId: string): Promise<any> {
    // TODO: Query from database
    return { id: workOrderId, type: 'predictive', status: 'draft' };
  }

  /**
   * Update work order status
   */
  private async updateWorkOrderStatus(workOrderId: string, status: string): Promise<void> {
    this.logger.log(`Updating WO ${workOrderId} status to: ${status}`);

    // TODO: Update in database
    /*
    UPDATE work_orders
    SET status = $1, updated_at = NOW()
    WHERE id = $2
    */
  }

  /**
   * Assign technician to work order
   */
  private async assignTechnician(workOrderId: string): Promise<void> {
    this.logger.log(`Assigning technician to WO: ${workOrderId}`);

    // TODO: Implement assignment logic
    // - Get asset location
    // - Find available technician at location
    // - Assign based on skill level and workload
  }

  /**
   * Notify technician of new assignment
   */
  private async notifyTechnician(workOrderId: string): Promise<void> {
    this.logger.log(`Notifying technician about WO: ${workOrderId}`);

    // TODO: Send notification
    // - Email
    // - Push notification
    // - In-app notification
  }

  /**
   * Log rejection for model improvement
   */
  private async logRejectionForModelImprovement(request: RejectionRequest): Promise<void> {
    this.logger.log(`Logging rejection feedback for model improvement: ${request.workOrderId}`);

    // In production:
    // 1. Store in ML feedback table
    // 2. Use for model retraining
    // 3. Analyze patterns in rejections
    // 4. Update model thresholds if needed
  }

  /**
   * Notify ML team of rejection
   */
  private async notifyMLTeam(request: RejectionRequest): Promise<void> {
    this.logger.log(`Notifying ML team of rejection: ${request.workOrderId}`);

    // Send summary to ML team
    const notification = {
      to: 'ml-team@example.com',
      subject: 'Predictive WO Rejected - Review Required',
      body: `
A predictive work order was rejected by supervisor:

Work Order ID: ${request.workOrderId}
Rejected By: ${request.rejectedBy}
Reason: ${request.reason}
Feedback: ${request.feedback || 'None'}

Please review the rejection to improve model accuracy.
      `,
    };

    // TODO: Integrate with notification service
  }
}
