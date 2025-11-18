import { Router } from 'express';
import { CostCalculationService } from '../services/cost-calculation.service';
import {
  CreateCostRecordRequest,
  UpdateCostRecordRequest,
  CreateLaborRateRequest,
  CreateEquipmentRateRequest,
  CostCalculationInput,
} from '../models/cost.models';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const costService = new CostCalculationService();

/**
 * @swagger
 * tags:
 *   name: Cost Management
 *   description: Work order cost tracking and calculation
 */

// ===== Cost Records =====

/**
 * @swagger
 * /api/v1/work-orders/{id}/costs:
 *   post:
 *     summary: Add a cost record to a work order
 *     tags: [Cost Management]
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
 *               - category
 *               - description
 *               - amount
 *               - createdBy
 *             properties:
 *               category:
 *                 type: string
 *                 enum: [labor, parts, equipment, other]
 *               description:
 *                 type: string
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *                 default: USD
 *               laborHours:
 *                 type: number
 *               technicianId:
 *                 type: string
 *               partId:
 *                 type: string
 *               partQuantity:
 *                 type: number
 *               equipmentType:
 *                 type: string
 *               equipmentHours:
 *                 type: number
 *               createdBy:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cost record added successfully
 *       400:
 *         description: Invalid request (negative amount, etc.)
 */
router.post('/:id/costs', authenticateToken, async (req, res) => {
  try {
    const { id: workOrderId } = req.params;

    const request: CreateCostRecordRequest = {
      workOrderId,
      ...req.body,
    };

    const costRecord = await costService.addCostRecord(request);

    res.json({
      message: 'Cost record added successfully',
      costRecord,
    });
  } catch (error) {
    console.error('Add cost record error:', error);

    if (error.message.includes('negative')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({
      error: 'Failed to add cost record',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/work-orders/{id}/costs:
 *   get:
 *     summary: Get all cost records for a work order
 *     tags: [Cost Management]
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
 *         description: List of cost records
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 workOrderId:
 *                   type: string
 *                 count:
 *                   type: integer
 *                 costs:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get('/:id/costs', authenticateToken, async (req, res) => {
  try {
    const { id: workOrderId } = req.params;

    const costs = await costService.getCostRecords(workOrderId);

    res.json({
      workOrderId,
      count: costs.length,
      costs,
    });
  } catch (error) {
    console.error('Get cost records error:', error);
    res.status(500).json({
      error: 'Failed to get cost records',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/work-orders/{workOrderId}/costs/{costId}:
 *   patch:
 *     summary: Update a cost record (manual entries only)
 *     tags: [Cost Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workOrderId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: costId
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
 *               - updatedBy
 *             properties:
 *               description:
 *                 type: string
 *               amount:
 *                 type: number
 *               updatedBy:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cost record updated
 *       400:
 *         description: Cannot update auto-calculated costs
 *       404:
 *         description: Cost record not found
 */
router.patch('/:workOrderId/costs/:costId', authenticateToken, async (req, res) => {
  try {
    const { costId } = req.params;

    const request: UpdateCostRecordRequest = req.body;

    const costRecord = await costService.updateCostRecord(costId, request);

    res.json({
      message: 'Cost record updated successfully',
      costRecord,
    });
  } catch (error) {
    console.error('Update cost record error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    if (error.message.includes('auto-calculated') || error.message.includes('negative')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({
      error: 'Failed to update cost record',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/work-orders/{workOrderId}/costs/{costId}:
 *   delete:
 *     summary: Delete a cost record (manual entries only)
 *     tags: [Cost Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workOrderId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: costId
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
 *               - deletedBy
 *             properties:
 *               deletedBy:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cost record deleted
 *       400:
 *         description: Cannot delete auto-calculated costs
 *       404:
 *         description: Cost record not found
 */
router.delete('/:workOrderId/costs/:costId', authenticateToken, async (req, res) => {
  try {
    const { costId } = req.params;
    const { deletedBy } = req.body;

    if (!deletedBy) {
      return res.status(400).json({ error: 'deletedBy is required' });
    }

    await costService.deleteCostRecord(costId, deletedBy);

    res.json({
      message: 'Cost record deleted successfully',
    });
  } catch (error) {
    console.error('Delete cost record error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    if (error.message.includes('auto-calculated')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({
      error: 'Failed to delete cost record',
      details: error.message,
    });
  }
});

// ===== Auto Cost Calculation =====

/**
 * @swagger
 * /api/v1/work-orders/{id}/costs/auto-calculate:
 *   post:
 *     summary: Auto-calculate costs (labor, parts, equipment)
 *     tags: [Cost Management]
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
 *             properties:
 *               laborRecords:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     hours:
 *                       type: number
 *                     technicianRole:
 *                       type: string
 *                     isOvertime:
 *                       type: boolean
 *               partsConsumed:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     partId:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                     unitPrice:
 *                       type: number
 *               equipmentUsage:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     equipmentType:
 *                       type: string
 *                     hours:
 *                       type: number
 *               calculatedBy:
 *                 type: string
 *     responses:
 *       200:
 *         description: Costs auto-calculated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 laborCost:
 *                   type: number
 *                 partsCost:
 *                   type: number
 *                 equipmentCost:
 *                   type: number
 *                 otherCost:
 *                   type: number
 *                 totalCost:
 *                   type: number
 *                 breakdown:
 *                   type: array
 */
router.post('/:id/costs/auto-calculate', authenticateToken, async (req, res) => {
  try {
    const { id: workOrderId } = req.params;
    const { calculatedBy, ...input } = req.body;

    if (!calculatedBy) {
      return res.status(400).json({ error: 'calculatedBy is required' });
    }

    const result = await costService.autoCalculateCosts(
      workOrderId,
      input as CostCalculationInput,
      calculatedBy
    );

    res.json({
      message: 'Costs auto-calculated successfully',
      ...result,
    });
  } catch (error) {
    console.error('Auto-calculate costs error:', error);
    res.status(500).json({
      error: 'Failed to auto-calculate costs',
      details: error.message,
    });
  }
});

// ===== Cost Summary =====

/**
 * @swagger
 * /api/v1/work-orders/{id}/cost-summary:
 *   get:
 *     summary: Get cost summary (breakdown by category)
 *     tags: [Cost Management]
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
 *         description: Cost summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 workOrderId:
 *                   type: string
 *                 totalCost:
 *                   type: number
 *                 currency:
 *                   type: string
 *                 breakdown:
 *                   type: object
 *                   properties:
 *                     labor:
 *                       type: object
 *                     parts:
 *                       type: object
 *                     equipment:
 *                       type: object
 *                     other:
 *                       type: object
 *                 autoCalculatedCost:
 *                   type: number
 *                 manualCost:
 *                   type: number
 *       404:
 *         description: No cost records found
 */
router.get('/:id/cost-summary', authenticateToken, async (req, res) => {
  try {
    const { id: workOrderId } = req.params;

    const summary = await costService.getCostSummary(workOrderId);

    res.json(summary);
  } catch (error) {
    console.error('Get cost summary error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({
      error: 'Failed to get cost summary',
      details: error.message,
    });
  }
});

// ===== Labor Rates =====

/**
 * @swagger
 * /api/v1/costs/labor-rates:
 *   post:
 *     summary: Create a labor rate
 *     tags: [Cost Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *               - hourlyRate
 *               - createdBy
 *             properties:
 *               role:
 *                 type: string
 *               hourlyRate:
 *                 type: number
 *               overtimeMultiplier:
 *                 type: number
 *                 default: 1.5
 *               currency:
 *                 type: string
 *                 default: USD
 *               createdBy:
 *                 type: string
 *     responses:
 *       200:
 *         description: Labor rate created
 */
router.post('/labor-rates', authenticateToken, async (req, res) => {
  try {
    const request: CreateLaborRateRequest = req.body;

    const laborRate = await costService.createLaborRate(request);

    res.json({
      message: 'Labor rate created successfully',
      laborRate,
    });
  } catch (error) {
    console.error('Create labor rate error:', error);
    res.status(500).json({
      error: 'Failed to create labor rate',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/costs/labor-rates:
 *   get:
 *     summary: Get all labor rates
 *     tags: [Cost Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: includeExpired
 *         schema:
 *           type: boolean
 *           default: false
 *     responses:
 *       200:
 *         description: List of labor rates
 */
router.get('/labor-rates', authenticateToken, async (req, res) => {
  try {
    const { includeExpired } = req.query;

    const rates = await costService.getLaborRates(includeExpired === 'true');

    res.json({
      count: rates.length,
      rates,
    });
  } catch (error) {
    console.error('Get labor rates error:', error);
    res.status(500).json({
      error: 'Failed to get labor rates',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/costs/labor-rates/{role}:
 *   put:
 *     summary: Update labor rate (creates new version)
 *     tags: [Cost Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: role
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
 *               - hourlyRate
 *               - updatedBy
 *             properties:
 *               hourlyRate:
 *                 type: number
 *               updatedBy:
 *                 type: string
 *     responses:
 *       200:
 *         description: Labor rate updated
 */
router.put('/labor-rates/:role', authenticateToken, async (req, res) => {
  try {
    const { role } = req.params;
    const { hourlyRate, updatedBy } = req.body;

    if (!hourlyRate || !updatedBy) {
      return res.status(400).json({
        error: 'hourlyRate and updatedBy are required',
      });
    }

    const laborRate = await costService.updateLaborRate(role, hourlyRate, updatedBy);

    res.json({
      message: 'Labor rate updated successfully',
      laborRate,
    });
  } catch (error) {
    console.error('Update labor rate error:', error);
    res.status(500).json({
      error: 'Failed to update labor rate',
      details: error.message,
    });
  }
});

// ===== Equipment Rates =====

/**
 * @swagger
 * /api/v1/costs/equipment-rates:
 *   post:
 *     summary: Create an equipment rate
 *     tags: [Cost Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - equipmentType
 *               - hourlyRate
 *               - createdBy
 *             properties:
 *               equipmentType:
 *                 type: string
 *               hourlyRate:
 *                 type: number
 *               currency:
 *                 type: string
 *                 default: USD
 *               createdBy:
 *                 type: string
 *     responses:
 *       200:
 *         description: Equipment rate created
 */
router.post('/equipment-rates', authenticateToken, async (req, res) => {
  try {
    const request: CreateEquipmentRateRequest = req.body;

    const equipmentRate = await costService.createEquipmentRate(request);

    res.json({
      message: 'Equipment rate created successfully',
      equipmentRate,
    });
  } catch (error) {
    console.error('Create equipment rate error:', error);
    res.status(500).json({
      error: 'Failed to create equipment rate',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/costs/equipment-rates:
 *   get:
 *     summary: Get all equipment rates
 *     tags: [Cost Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: includeExpired
 *         schema:
 *           type: boolean
 *           default: false
 *     responses:
 *       200:
 *         description: List of equipment rates
 */
router.get('/equipment-rates', authenticateToken, async (req, res) => {
  try {
    const { includeExpired } = req.query;

    const rates = await costService.getEquipmentRates(includeExpired === 'true');

    res.json({
      count: rates.length,
      rates,
    });
  } catch (error) {
    console.error('Get equipment rates error:', error);
    res.status(500).json({
      error: 'Failed to get equipment rates',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/costs/equipment-rates/{equipmentType}:
 *   put:
 *     summary: Update equipment rate (creates new version)
 *     tags: [Cost Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: equipmentType
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
 *               - hourlyRate
 *               - updatedBy
 *             properties:
 *               hourlyRate:
 *                 type: number
 *               updatedBy:
 *                 type: string
 *     responses:
 *       200:
 *         description: Equipment rate updated
 */
router.put('/equipment-rates/:equipmentType', authenticateToken, async (req, res) => {
  try {
    const { equipmentType } = req.params;
    const { hourlyRate, updatedBy } = req.body;

    if (!hourlyRate || !updatedBy) {
      return res.status(400).json({
        error: 'hourlyRate and updatedBy are required',
      });
    }

    const equipmentRate = await costService.updateEquipmentRate(
      equipmentType,
      hourlyRate,
      updatedBy
    );

    res.json({
      message: 'Equipment rate updated successfully',
      equipmentRate,
    });
  } catch (error) {
    console.error('Update equipment rate error:', error);
    res.status(500).json({
      error: 'Failed to update equipment rate',
      details: error.message,
    });
  }
});

export default router;
