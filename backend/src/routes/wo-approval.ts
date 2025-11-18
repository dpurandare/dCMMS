import { Router } from 'express';
import { WorkOrderApprovalService, ApprovalRequest, RejectionRequest } from '../services/wo-approval.service';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const approvalService = new WorkOrderApprovalService();

/**
 * @swagger
 * tags:
 *   name: Work Order Approval
 *   description: Human-in-the-loop approval workflow for predictive work orders
 */

/**
 * @swagger
 * /api/v1/work-orders/{id}/approve:
 *   post:
 *     summary: Approve a predictive work order
 *     tags: [Work Order Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Work order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - approvedBy
 *             properties:
 *               approvedBy:
 *                 type: string
 *                 description: User ID of approver
 *                 example: "supervisor_123"
 *               comments:
 *                 type: string
 *                 description: Optional approval comments
 *                 example: "Approved - critical asset"
 *     responses:
 *       200:
 *         description: Work order approved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 workOrderId:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [approved]
 *                 approvedBy:
 *                   type: string
 *                 approvalDate:
 *                   type: string
 *                   format: date-time
 *                 comments:
 *                   type: string
 *       400:
 *         description: Invalid request or work order already processed
 *       404:
 *         description: Work order not found
 */
router.post('/:id/approve', authenticateToken, async (req, res) => {
  try {
    const { id: workOrderId } = req.params;
    const { approvedBy, comments } = req.body;

    if (!approvedBy) {
      return res.status(400).json({
        error: 'approvedBy is required',
      });
    }

    const request: ApprovalRequest = {
      workOrderId,
      approvedBy,
      comments,
    };

    const approval = await approvalService.approveWorkOrder(request);

    res.json({
      message: 'Work order approved successfully',
      approval,
    });
  } catch (error) {
    console.error('Approval error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    if (error.message.includes('already')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({
      error: 'Failed to approve work order',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/work-orders/{id}/reject:
 *   post:
 *     summary: Reject a predictive work order with feedback
 *     tags: [Work Order Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Work order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rejectedBy
 *               - reason
 *             properties:
 *               rejectedBy:
 *                 type: string
 *                 description: User ID of rejector
 *                 example: "supervisor_123"
 *               reason:
 *                 type: string
 *                 description: Rejection reason
 *                 example: "False alarm - asset recently serviced"
 *                 enum:
 *                   - false_alarm
 *                   - duplicate
 *                   - low_priority
 *                   - incorrect_prediction
 *                   - other
 *               feedback:
 *                 type: string
 *                 description: Additional feedback for ML team
 *                 example: "Model did not account for recent maintenance"
 *     responses:
 *       200:
 *         description: Work order rejected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 workOrderId:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [rejected]
 *                 rejectedBy:
 *                   type: string
 *                 rejectionDate:
 *                   type: string
 *                   format: date-time
 *                 rejectionReason:
 *                   type: string
 *                 feedback:
 *                   type: string
 *       400:
 *         description: Invalid request or work order already processed
 *       404:
 *         description: Work order not found
 */
router.post('/:id/reject', authenticateToken, async (req, res) => {
  try {
    const { id: workOrderId } = req.params;
    const { rejectedBy, reason, feedback } = req.body;

    if (!rejectedBy) {
      return res.status(400).json({
        error: 'rejectedBy is required',
      });
    }

    if (!reason) {
      return res.status(400).json({
        error: 'reason is required',
      });
    }

    const request: RejectionRequest = {
      workOrderId,
      rejectedBy,
      reason,
      feedback,
    };

    const approval = await approvalService.rejectWorkOrder(request);

    res.json({
      message: 'Work order rejected successfully',
      approval,
    });
  } catch (error) {
    console.error('Rejection error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    if (error.message.includes('already')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({
      error: 'Failed to reject work order',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/work-orders/batch-approve:
 *   post:
 *     summary: Batch approve multiple work orders
 *     tags: [Work Order Approval]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - workOrderIds
 *               - approvedBy
 *             properties:
 *               workOrderIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of work order IDs to approve
 *                 example: ["wo_123", "wo_124", "wo_125"]
 *               approvedBy:
 *                 type: string
 *                 description: User ID of approver
 *                 example: "supervisor_123"
 *               comments:
 *                 type: string
 *                 description: Optional comments for all approvals
 *                 example: "Batch approval - weekly review"
 *     responses:
 *       200:
 *         description: Batch approval completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 approved:
 *                   type: integer
 *                   description: Number of work orders approved
 *                 failed:
 *                   type: integer
 *                   description: Number of work orders that failed
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Error messages for failed approvals
 *       400:
 *         description: Invalid request
 */
router.post('/batch-approve', authenticateToken, async (req, res) => {
  try {
    const { workOrderIds, approvedBy, comments } = req.body;

    if (!workOrderIds || !Array.isArray(workOrderIds)) {
      return res.status(400).json({
        error: 'workOrderIds must be an array',
      });
    }

    if (workOrderIds.length === 0) {
      return res.status(400).json({
        error: 'workOrderIds array cannot be empty',
      });
    }

    if (workOrderIds.length > 50) {
      return res.status(400).json({
        error: 'Maximum 50 work orders can be approved in a single batch',
      });
    }

    if (!approvedBy) {
      return res.status(400).json({
        error: 'approvedBy is required',
      });
    }

    const result = await approvalService.batchApprove(
      workOrderIds,
      approvedBy,
      comments
    );

    res.json({
      message: 'Batch approval completed',
      ...result,
    });
  } catch (error) {
    console.error('Batch approval error:', error);
    res.status(500).json({
      error: 'Failed to batch approve work orders',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/work-orders/{id}/approval-status:
 *   get:
 *     summary: Get approval status for a work order
 *     tags: [Work Order Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Work order ID
 *     responses:
 *       200:
 *         description: Approval status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 workOrderId:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [pending, approved, rejected]
 *                 approvedBy:
 *                   type: string
 *                 rejectedBy:
 *                   type: string
 *                 approvalDate:
 *                   type: string
 *                   format: date-time
 *                 rejectionDate:
 *                   type: string
 *                   format: date-time
 *                 comments:
 *                   type: string
 *                 rejectionReason:
 *                   type: string
 *                 feedback:
 *                   type: string
 */
router.get('/:id/approval-status', authenticateToken, async (req, res) => {
  try {
    const { id: workOrderId } = req.params;

    const status = await approvalService.getApprovalStatus(workOrderId);

    res.json(status);
  } catch (error) {
    console.error('Get approval status error:', error);
    res.status(500).json({
      error: 'Failed to get approval status',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/work-orders/approval-stats:
 *   get:
 *     summary: Get approval statistics
 *     tags: [Work Order Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for statistics
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for statistics
 *     responses:
 *       200:
 *         description: Approval statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalPredictiveWOs:
 *                   type: integer
 *                   description: Total predictive work orders
 *                 approved:
 *                   type: integer
 *                   description: Number approved
 *                 rejected:
 *                   type: integer
 *                   description: Number rejected
 *                 pending:
 *                   type: integer
 *                   description: Number pending
 *                 approvalRate:
 *                   type: number
 *                   description: Approval rate percentage
 *                 avgApprovalTimeHours:
 *                   type: number
 *                   description: Average time to approve (hours)
 *                 rejectionReasons:
 *                   type: object
 *                   description: Count of each rejection reason
 */
router.get('/approval-stats', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const stats = await approvalService.getApprovalStats(start, end);

    res.json(stats);
  } catch (error) {
    console.error('Get approval stats error:', error);
    res.status(500).json({
      error: 'Failed to get approval statistics',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/work-orders/rejection-feedback:
 *   get:
 *     summary: Get rejection feedback for ML team review
 *     tags: [Work Order Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of feedback items to return
 *     responses:
 *       200:
 *         description: Rejection feedback
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   workOrderId:
 *                     type: string
 *                   reason:
 *                     type: string
 *                   feedback:
 *                     type: string
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 */
router.get('/rejection-feedback', authenticateToken, async (req, res) => {
  try {
    const { limit } = req.query;

    const limitNum = limit ? parseInt(limit as string, 10) : 100;

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
      return res.status(400).json({
        error: 'limit must be between 1 and 1000',
      });
    }

    const feedback = await approvalService.getRejectionFeedback(limitNum);

    res.json({
      count: feedback.length,
      feedback,
    });
  } catch (error) {
    console.error('Get rejection feedback error:', error);
    res.status(500).json({
      error: 'Failed to get rejection feedback',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/work-orders/{id}/complete:
 *   post:
 *     summary: Record work order completion with ground truth
 *     tags: [Work Order Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Work order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assetId
 *               - failureOccurred
 *             properties:
 *               assetId:
 *                 type: string
 *                 description: Asset ID
 *                 example: "asset_123"
 *               failureOccurred:
 *                 type: boolean
 *                 description: Did the asset actually fail?
 *                 example: true
 *               failureType:
 *                 type: string
 *                 description: Type of failure (if occurred)
 *                 example: "mechanical_failure"
 *     responses:
 *       200:
 *         description: Work order completion recorded
 *       400:
 *         description: Invalid request
 */
router.post('/:id/complete', authenticateToken, async (req, res) => {
  try {
    const { id: workOrderId } = req.params;
    const { assetId, failureOccurred, failureType } = req.body;

    if (!assetId) {
      return res.status(400).json({ error: 'assetId is required' });
    }

    if (typeof failureOccurred !== 'boolean') {
      return res.status(400).json({
        error: 'failureOccurred must be a boolean',
      });
    }

    await approvalService.recordWorkOrderCompletion(
      workOrderId,
      assetId,
      failureOccurred,
      failureType
    );

    res.json({
      message: 'Work order completion recorded successfully',
      workOrderId,
      assetId,
      failureOccurred,
    });
  } catch (error) {
    console.error('Record completion error:', error);
    res.status(500).json({
      error: 'Failed to record work order completion',
      details: error.message,
    });
  }
});

export default router;
