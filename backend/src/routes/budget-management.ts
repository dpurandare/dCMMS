import { Router } from 'express';
import { BudgetManagementService } from '../services/budget-management.service';
import { CreateBudgetRequest, UpdateBudgetRequest, BudgetPeriod, BudgetStatus, CostCategory } from '../models/cost.models';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const budgetService = new BudgetManagementService(null); // Pass cost service in production

/**
 * @swagger
 * tags:
 *   name: Budget Management
 *   description: Budget tracking and monitoring
 */

// ===== Budget CRUD =====

/**
 * @swagger
 * /api/v1/budgets:
 *   post:
 *     summary: Create a budget for a site/period
 *     tags: [Budget Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - siteId
 *               - budgetPeriod
 *               - periodStart
 *               - periodEnd
 *               - category
 *               - allocatedAmount
 *               - createdBy
 *             properties:
 *               siteId:
 *                 type: string
 *               budgetPeriod:
 *                 type: string
 *                 enum: [monthly, quarterly, yearly]
 *               periodStart:
 *                 type: string
 *                 format: date-time
 *               periodEnd:
 *                 type: string
 *                 format: date-time
 *               category:
 *                 type: string
 *                 enum: [labor, parts, equipment, other, all]
 *               allocatedAmount:
 *                 type: number
 *               currency:
 *                 type: string
 *                 default: USD
 *               createdBy:
 *                 type: string
 *     responses:
 *       200:
 *         description: Budget created successfully
 *       400:
 *         description: Invalid request (negative amount, invalid dates, etc.)
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const request: CreateBudgetRequest = {
      ...req.body,
      periodStart: new Date(req.body.periodStart),
      periodEnd: new Date(req.body.periodEnd),
    };

    const budget = await budgetService.createBudget(request);

    res.json({
      message: 'Budget created successfully',
      budget,
    });
  } catch (error) {
    console.error('Create budget error:', error);

    if (error.message.includes('must be') || error.message.includes('Invalid')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({
      error: 'Failed to create budget',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/budgets:
 *   get:
 *     summary: Get budgets with filters
 *     tags: [Budget Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: siteId
 *         schema:
 *           type: string
 *       - in: query
 *         name: budgetPeriod
 *         schema:
 *           type: string
 *           enum: [monthly, quarterly, yearly]
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [labor, parts, equipment, other, all]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [on_track, at_risk, over_budget]
 *     responses:
 *       200:
 *         description: List of budgets
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                 budgets:
 *                   type: array
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { siteId, budgetPeriod, category, status } = req.query;

    const budgets = await budgetService.getBudgets({
      siteId: siteId as string,
      budgetPeriod: budgetPeriod as BudgetPeriod,
      category: category as CostCategory | 'all',
      status: status as BudgetStatus,
    });

    res.json({
      count: budgets.length,
      budgets,
    });
  } catch (error) {
    console.error('Get budgets error:', error);
    res.status(500).json({
      error: 'Failed to get budgets',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/budgets/{id}:
 *   get:
 *     summary: Get a single budget
 *     tags: [Budget Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Budget details
 *       404:
 *         description: Budget not found
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const budget = await budgetService.getBudget(id);

    res.json(budget);
  } catch (error) {
    console.error('Get budget error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({
      error: 'Failed to get budget',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/budgets/{id}:
 *   patch:
 *     summary: Update budget allocated amount
 *     tags: [Budget Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               allocatedAmount:
 *                 type: number
 *               updatedBy:
 *                 type: string
 *     responses:
 *       200:
 *         description: Budget updated
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Budget not found
 */
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const request: UpdateBudgetRequest = req.body;

    const budget = await budgetService.updateBudget(id, request);

    res.json({
      message: 'Budget updated successfully',
      budget,
    });
  } catch (error) {
    console.error('Update budget error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    if (error.message.includes('must be')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({
      error: 'Failed to update budget',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/budgets/{id}:
 *   delete:
 *     summary: Delete a budget
 *     tags: [Budget Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *         description: Budget deleted
 *       404:
 *         description: Budget not found
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { deletedBy } = req.body;

    if (!deletedBy) {
      return res.status(400).json({ error: 'deletedBy is required' });
    }

    await budgetService.deleteBudget(id, deletedBy);

    res.json({
      message: 'Budget deleted successfully',
    });
  } catch (error) {
    console.error('Delete budget error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({
      error: 'Failed to delete budget',
      details: error.message,
    });
  }
});

// ===== Budget Spending =====

/**
 * @swagger
 * /api/v1/budgets/{id}/spending:
 *   get:
 *     summary: Get current spending vs allocated
 *     tags: [Budget Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Budget spending details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 budgetId:
 *                   type: string
 *                 budget:
 *                   type: object
 *                 currentSpending:
 *                   type: number
 *                 projectedSpending:
 *                   type: number
 *                 daysRemaining:
 *                   type: number
 *                 dailyBurnRate:
 *                   type: number
 *                 isOnTrack:
 *                   type: boolean
 *                 alerts:
 *                   type: array
 *                   items:
 *                     type: string
 *       404:
 *         description: Budget not found
 */
router.get('/:id/spending', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const spending = await budgetService.getBudgetSpending(id);

    res.json(spending);
  } catch (error) {
    console.error('Get budget spending error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({
      error: 'Failed to get budget spending',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/budgets/{id}/forecast:
 *   get:
 *     summary: Predict end-of-period spending (linear extrapolation)
 *     tags: [Budget Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Budget forecast
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 budgetId:
 *                   type: string
 *                 currentSpending:
 *                   type: number
 *                 forecastedEndOfPeriodSpending:
 *                   type: number
 *                 confidence:
 *                   type: number
 *                   description: Confidence level (0-1)
 *                 method:
 *                   type: string
 *                 assumptions:
 *                   type: array
 *                   items:
 *                     type: string
 *                 warnings:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.get('/:id/forecast', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const forecast = await budgetService.forecastBudgetSpending(id);

    res.json(forecast);
  } catch (error) {
    console.error('Get budget forecast error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({
      error: 'Failed to get budget forecast',
      details: error.message,
    });
  }
});

// ===== Budget Alerts =====

/**
 * @swagger
 * /api/v1/budgets/alerts:
 *   get:
 *     summary: Get active budget alerts (>80% spent)
 *     tags: [Budget Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: budgetId
 *         schema:
 *           type: string
 *         description: Filter by budget ID
 *     responses:
 *       200:
 *         description: List of budget alerts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                 alerts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       budgetId:
 *                         type: string
 *                       alertType:
 *                         type: string
 *                         enum: [warning, critical, over_budget]
 *                       message:
 *                         type: string
 *                       spentPercentage:
 *                         type: number
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 */
router.get('/alerts', authenticateToken, async (req, res) => {
  try {
    const { budgetId } = req.query;

    const alerts = await budgetService.getBudgetAlerts(budgetId as string);

    res.json({
      count: alerts.length,
      alerts,
    });
  } catch (error) {
    console.error('Get budget alerts error:', error);
    res.status(500).json({
      error: 'Failed to get budget alerts',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/budgets/alerts/{alertId}/acknowledge:
 *   post:
 *     summary: Acknowledge a budget alert
 *     tags: [Budget Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: alertId
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
 *               - acknowledgedBy
 *             properties:
 *               acknowledgedBy:
 *                 type: string
 *     responses:
 *       200:
 *         description: Alert acknowledged
 *       404:
 *         description: Alert not found
 */
router.post('/alerts/:alertId/acknowledge', authenticateToken, async (req, res) => {
  try {
    const { alertId } = req.params;
    const { acknowledgedBy } = req.body;

    if (!acknowledgedBy) {
      return res.status(400).json({ error: 'acknowledgedBy is required' });
    }

    const alert = await budgetService.acknowledgeBudgetAlert(alertId, acknowledgedBy);

    res.json({
      message: 'Budget alert acknowledged successfully',
      alert,
    });
  } catch (error) {
    console.error('Acknowledge budget alert error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({
      error: 'Failed to acknowledge budget alert',
      details: error.message,
    });
  }
});

export default router;
