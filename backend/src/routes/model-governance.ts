import { Router } from 'express';
import {
  ModelGovernanceService,
  ModelDocumentation,
  ModelStage,
} from '../services/model-governance.service';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const governanceService = new ModelGovernanceService();

/**
 * @swagger
 * tags:
 *   name: Model Governance
 *   description: ML model governance and compliance
 */

/**
 * @swagger
 * /api/v1/model-governance/register:
 *   post:
 *     summary: Register a new model
 *     tags: [Model Governance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - modelName
 *               - version
 *               - description
 *               - owner
 *             properties:
 *               modelName:
 *                 type: string
 *                 example: "predictive_maintenance"
 *               version:
 *                 type: string
 *                 example: "v2.0.0"
 *               description:
 *                 type: string
 *               owner:
 *                 type: string
 *     responses:
 *       200:
 *         description: Model registered successfully
 *       400:
 *         description: Model already registered
 */
router.post('/register', authenticateToken, async (req, res) => {
  try {
    const { modelName, version, description, owner } = req.body;

    if (!modelName || !version || !description || !owner) {
      return res.status(400).json({
        error: 'modelName, version, description, and owner are required',
      });
    }

    const registration = await governanceService.registerModel(
      modelName,
      version,
      description,
      owner
    );

    res.json({
      message: 'Model registered successfully',
      registration,
    });
  } catch (error) {
    console.error('Register model error:', error);

    if (error.message.includes('already registered')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({
      error: 'Failed to register model',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/model-governance/{modelId}/stage:
 *   put:
 *     summary: Update model stage
 *     tags: [Model Governance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: modelId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newStage
 *               - updatedBy
 *             properties:
 *               newStage:
 *                 type: string
 *                 enum: [development, staging, review, production, retired]
 *               updatedBy:
 *                 type: string
 *     responses:
 *       200:
 *         description: Model stage updated
 *       400:
 *         description: Invalid stage transition
 *       404:
 *         description: Model not found
 */
router.put('/:modelId/stage', authenticateToken, async (req, res) => {
  try {
    const { modelId } = req.params;
    const { newStage, updatedBy } = req.body;

    if (!newStage || !updatedBy) {
      return res.status(400).json({
        error: 'newStage and updatedBy are required',
      });
    }

    const model = await governanceService.updateModelStage(
      modelId,
      newStage as ModelStage,
      updatedBy
    );

    res.json({
      message: 'Model stage updated successfully',
      model,
    });
  } catch (error) {
    console.error('Update stage error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    if (error.message.includes('Invalid')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({
      error: 'Failed to update model stage',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/model-governance/{modelId}/approval/request:
 *   post:
 *     summary: Request approval for model promotion
 *     tags: [Model Governance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: modelId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - requestedBy
 *               - approvers
 *             properties:
 *               requestedBy:
 *                 type: string
 *               approvers:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Approval request created
 */
router.post('/:modelId/approval/request', authenticateToken, async (req, res) => {
  try {
    const { modelId } = req.params;
    const { requestedBy, approvers } = req.body;

    if (!requestedBy || !approvers || !Array.isArray(approvers)) {
      return res.status(400).json({
        error: 'requestedBy and approvers (array) are required',
      });
    }

    const approval = await governanceService.requestApproval(
      modelId,
      requestedBy,
      approvers
    );

    res.json({
      message: 'Approval request created successfully',
      approval,
    });
  } catch (error) {
    console.error('Request approval error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    if (error.message.includes('stage')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({
      error: 'Failed to request approval',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/model-governance/{modelId}/approval/approve:
 *   post:
 *     summary: Approve model for production
 *     tags: [Model Governance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: modelId
 *         required: true
 *         schema:
 *           type: string
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
 *     responses:
 *       200:
 *         description: Model approved
 */
router.post('/:modelId/approval/approve', authenticateToken, async (req, res) => {
  try {
    const { modelId } = req.params;
    const { approvedBy } = req.body;

    if (!approvedBy) {
      return res.status(400).json({ error: 'approvedBy is required' });
    }

    const approval = await governanceService.approveModel(modelId, approvedBy);

    res.json({
      message: 'Model approved successfully',
      approval,
    });
  } catch (error) {
    console.error('Approve model error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    if (error.message.includes('approver') || error.message.includes('checklist')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({
      error: 'Failed to approve model',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/model-governance/{modelId}/approval/reject:
 *   post:
 *     summary: Reject model approval
 *     tags: [Model Governance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: modelId
 *         required: true
 *         schema:
 *           type: string
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
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Model rejected
 */
router.post('/:modelId/approval/reject', authenticateToken, async (req, res) => {
  try {
    const { modelId } = req.params;
    const { rejectedBy, reason } = req.body;

    if (!rejectedBy || !reason) {
      return res.status(400).json({
        error: 'rejectedBy and reason are required',
      });
    }

    const approval = await governanceService.rejectModel(modelId, rejectedBy, reason);

    res.json({
      message: 'Model rejected',
      approval,
    });
  } catch (error) {
    console.error('Reject model error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({
      error: 'Failed to reject model',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/model-governance/{modelId}/checklist/{itemId}:
 *   put:
 *     summary: Update checklist item
 *     tags: [Model Governance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: modelId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - completed
 *               - completedBy
 *             properties:
 *               completed:
 *                 type: boolean
 *               completedBy:
 *                 type: string
 *               evidence:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Checklist item updated
 */
router.put('/:modelId/checklist/:itemId', authenticateToken, async (req, res) => {
  try {
    const { modelId, itemId } = req.params;
    const { completed, completedBy, evidence, notes } = req.body;

    if (typeof completed !== 'boolean' || !completedBy) {
      return res.status(400).json({
        error: 'completed (boolean) and completedBy are required',
      });
    }

    const approval = await governanceService.updateChecklistItem(
      modelId,
      itemId,
      completed,
      completedBy,
      evidence,
      notes
    );

    res.json({
      message: 'Checklist item updated',
      approval,
    });
  } catch (error) {
    console.error('Update checklist error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({
      error: 'Failed to update checklist item',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/model-governance/{modelId}/documentation:
 *   post:
 *     summary: Add model documentation
 *     tags: [Model Governance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: modelId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Documentation added
 */
router.post('/:modelId/documentation', authenticateToken, async (req, res) => {
  try {
    const { modelId } = req.params;
    const doc: ModelDocumentation = {
      modelId,
      ...req.body,
      lastUpdated: new Date(),
    };

    const documentation = await governanceService.addDocumentation(doc);

    res.json({
      message: 'Documentation added successfully',
      documentation,
    });
  } catch (error) {
    console.error('Add documentation error:', error);
    res.status(500).json({
      error: 'Failed to add documentation',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/model-governance/{modelId}/documentation:
 *   get:
 *     summary: Get model documentation
 *     tags: [Model Governance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: modelId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Model documentation
 *       404:
 *         description: Documentation not found
 */
router.get('/:modelId/documentation', authenticateToken, async (req, res) => {
  try {
    const { modelId } = req.params;

    const documentation = await governanceService.getDocumentation(modelId);

    res.json(documentation);
  } catch (error) {
    console.error('Get documentation error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({
      error: 'Failed to get documentation',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/model-governance/{modelId}/retire:
 *   post:
 *     summary: Retire a model
 *     tags: [Model Governance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: modelId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - retiredBy
 *               - reason
 *             properties:
 *               retiredBy:
 *                 type: string
 *               reason:
 *                 type: string
 *               replacementModelId:
 *                 type: string
 *               dataRetentionPolicy:
 *                 type: string
 *     responses:
 *       200:
 *         description: Model retired
 */
router.post('/:modelId/retire', authenticateToken, async (req, res) => {
  try {
    const { modelId } = req.params;
    const { retiredBy, reason, replacementModelId, dataRetentionPolicy } = req.body;

    if (!retiredBy || !reason) {
      return res.status(400).json({
        error: 'retiredBy and reason are required',
      });
    }

    const retirement = await governanceService.retireModel(
      modelId,
      retiredBy,
      reason,
      replacementModelId,
      dataRetentionPolicy
    );

    res.json({
      message: 'Model retired successfully',
      retirement,
    });
  } catch (error) {
    console.error('Retire model error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({
      error: 'Failed to retire model',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/model-governance/{modelId}/incidents:
 *   post:
 *     summary: Report an incident
 *     tags: [Model Governance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: modelId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - severity
 *               - type
 *               - description
 *               - impact
 *               - reportedBy
 *             properties:
 *               severity:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *               type:
 *                 type: string
 *                 enum: [prediction_error, performance_degradation, bias, security, compliance, other]
 *               description:
 *                 type: string
 *               impact:
 *                 type: string
 *               reportedBy:
 *                 type: string
 *     responses:
 *       200:
 *         description: Incident reported
 */
router.post('/:modelId/incidents', authenticateToken, async (req, res) => {
  try {
    const { modelId } = req.params;
    const { severity, type, description, impact, reportedBy } = req.body;

    if (!severity || !type || !description || !impact || !reportedBy) {
      return res.status(400).json({
        error: 'severity, type, description, impact, and reportedBy are required',
      });
    }

    const incident = await governanceService.reportIncident(
      modelId,
      severity,
      type,
      description,
      impact,
      reportedBy
    );

    res.json({
      message: 'Incident reported successfully',
      incident,
    });
  } catch (error) {
    console.error('Report incident error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({
      error: 'Failed to report incident',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/model-governance/incidents/{incidentId}:
 *   put:
 *     summary: Update incident status
 *     tags: [Model Governance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: incidentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [open, investigating, resolved, closed]
 *               resolution:
 *                 type: string
 *               resolvedBy:
 *                 type: string
 *               actionsTaken:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Incident updated
 */
router.put('/incidents/:incidentId', authenticateToken, async (req, res) => {
  try {
    const { incidentId } = req.params;
    const { status, resolution, resolvedBy, actionsTaken } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    const incident = await governanceService.updateIncident(
      incidentId,
      status,
      resolution,
      resolvedBy,
      actionsTaken
    );

    res.json({
      message: 'Incident updated successfully',
      incident,
    });
  } catch (error) {
    console.error('Update incident error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({
      error: 'Failed to update incident',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/model-governance/models:
 *   get:
 *     summary: Get models by stage
 *     tags: [Model Governance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: stage
 *         schema:
 *           type: string
 *           enum: [development, staging, review, production, retired]
 *     responses:
 *       200:
 *         description: List of models
 */
router.get('/models', authenticateToken, async (req, res) => {
  try {
    const { stage } = req.query;

    if (!stage) {
      return res.status(400).json({ error: 'stage query parameter is required' });
    }

    const models = await governanceService.getModelsByStage(stage as ModelStage);

    res.json({
      stage,
      count: models.length,
      models,
    });
  } catch (error) {
    console.error('Get models error:', error);
    res.status(500).json({
      error: 'Failed to get models',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/model-governance/approvals/pending:
 *   get:
 *     summary: Get pending approvals
 *     tags: [Model Governance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending approvals
 */
router.get('/approvals/pending', authenticateToken, async (req, res) => {
  try {
    const approvals = await governanceService.getPendingApprovals();

    res.json({
      count: approvals.length,
      approvals,
    });
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({
      error: 'Failed to get pending approvals',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/model-governance/incidents/open:
 *   get:
 *     summary: Get open incidents
 *     tags: [Model Governance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *     responses:
 *       200:
 *         description: List of open incidents
 */
router.get('/incidents/open', authenticateToken, async (req, res) => {
  try {
    const { severity } = req.query;

    const incidents = await governanceService.getOpenIncidents(severity as any);

    res.json({
      count: incidents.length,
      incidents,
    });
  } catch (error) {
    console.error('Get open incidents error:', error);
    res.status(500).json({
      error: 'Failed to get open incidents',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/model-governance/{modelId}/audit:
 *   get:
 *     summary: Get model audit trail
 *     tags: [Model Governance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: modelId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Model audit trail
 *       404:
 *         description: Model not found
 */
router.get('/:modelId/audit', authenticateToken, async (req, res) => {
  try {
    const { modelId } = req.params;

    const audit = await governanceService.getModelAuditTrail(modelId);

    res.json(audit);
  } catch (error) {
    console.error('Get audit trail error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({
      error: 'Failed to get audit trail',
      details: error.message,
    });
  }
});

export default router;
