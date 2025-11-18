import { Router } from 'express';
import { CostAnalyticsService } from '../services/cost-analytics.service';
import { CostAnalyticsQuery, CostExportOptions } from '../models/cost.models';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const analyticsService = new CostAnalyticsService(null); // Pass cost service in production

/**
 * @swagger
 * tags:
 *   name: Cost Analytics
 *   description: Cost analytics and reporting
 */

/**
 * @swagger
 * /api/v1/analytics/costs:
 *   get:
 *     summary: Get aggregate cost analytics
 *     tags: [Cost Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: siteId
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: groupBy
 *         required: true
 *         schema:
 *           type: string
 *           enum: [site, asset, wo_type, category, month]
 *       - in: query
 *         name: categories
 *         schema:
 *           type: string
 *           description: Comma-separated list of categories
 *       - in: query
 *         name: woTypes
 *         schema:
 *           type: string
 *           description: Comma-separated list of WO types
 *     responses:
 *       200:
 *         description: Cost analytics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalCost:
 *                   type: number
 *                 averageCostPerWO:
 *                   type: number
 *                 costPerAsset:
 *                   type: number
 *                 costVariance:
 *                   type: number
 *                 categoryBreakdown:
 *                   type: object
 *                 trends:
 *                   type: array
 *                 groups:
 *                   type: array
 *                 comparison:
 *                   type: object
 *       400:
 *         description: Invalid request
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { siteId, startDate, endDate, groupBy, categories, woTypes } = req.query;

    if (!startDate || !endDate || !groupBy) {
      return res.status(400).json({
        error: 'startDate, endDate, and groupBy are required',
      });
    }

    const query: CostAnalyticsQuery = {
      siteId: siteId as string,
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string),
      groupBy: groupBy as any,
      categories: categories ? (categories as string).split(',') as any[] : undefined,
      woTypes: woTypes ? (woTypes as string).split(',') : undefined,
    };

    const analytics = await analyticsService.getCostAnalytics(query);

    res.json(analytics);
  } catch (error) {
    console.error('Get cost analytics error:', error);
    res.status(500).json({
      error: 'Failed to get cost analytics',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/analytics/costs/trends:
 *   get:
 *     summary: Get cost trends over time (monthly aggregates)
 *     tags: [Cost Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: siteId
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Cost trends
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   month:
 *                     type: string
 *                   totalCost:
 *                     type: number
 *                   laborCost:
 *                     type: number
 *                   partsCost:
 *                     type: number
 *                   equipmentCost:
 *                     type: number
 *                   otherCost:
 *                     type: number
 *                   woCount:
 *                     type: integer
 *                   avgCostPerWO:
 *                     type: number
 */
router.get('/trends', authenticateToken, async (req, res) => {
  try {
    const { siteId, startDate, endDate } = req.query;

    const trends = await analyticsService.getCostTrends(
      siteId as string,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json({
      count: trends.length,
      trends,
    });
  } catch (error) {
    console.error('Get cost trends error:', error);
    res.status(500).json({
      error: 'Failed to get cost trends',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/analytics/costs/by-site:
 *   get:
 *     summary: Get cost breakdown by site
 *     tags: [Cost Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Cost by site
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   siteId:
 *                     type: string
 *                   siteName:
 *                     type: string
 *                   totalCost:
 *                     type: number
 *                   woCount:
 *                     type: integer
 *                   avgCostPerWO:
 *                     type: number
 */
router.get('/by-site', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'startDate and endDate are required',
      });
    }

    const costBySite = await analyticsService.getCostBySite(
      new Date(startDate as string),
      new Date(endDate as string)
    );

    res.json({
      count: costBySite.length,
      sites: costBySite,
    });
  } catch (error) {
    console.error('Get cost by site error:', error);
    res.status(500).json({
      error: 'Failed to get cost by site',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/analytics/costs/by-wo-type:
 *   get:
 *     summary: Get cost breakdown by work order type
 *     tags: [Cost Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: siteId
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Cost by WO type
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   woType:
 *                     type: string
 *                   totalCost:
 *                     type: number
 *                   woCount:
 *                     type: integer
 *                   avgCostPerWO:
 *                     type: number
 *                   percentage:
 *                     type: number
 */
router.get('/by-wo-type', authenticateToken, async (req, res) => {
  try {
    const { siteId, startDate, endDate } = req.query;

    const costByWOType = await analyticsService.getCostByWOType(
      siteId as string,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json({
      count: costByWOType.length,
      woTypes: costByWOType,
    });
  } catch (error) {
    console.error('Get cost by WO type error:', error);
    res.status(500).json({
      error: 'Failed to get cost by WO type',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/analytics/costs/variance:
 *   get:
 *     summary: Get cost variance (current vs previous period)
 *     tags: [Cost Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: siteId
 *         schema:
 *           type: string
 *       - in: query
 *         name: currentPeriodStart
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: currentPeriodEnd
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Cost variance
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 currentPeriod:
 *                   type: object
 *                   properties:
 *                     cost:
 *                       type: number
 *                     woCount:
 *                       type: integer
 *                 previousPeriod:
 *                   type: object
 *                 variance:
 *                   type: object
 *                   properties:
 *                     costChange:
 *                       type: number
 *                     costChangePercentage:
 *                       type: number
 *                     woCountChange:
 *                       type: integer
 *                     woCountChangePercentage:
 *                       type: number
 */
router.get('/variance', authenticateToken, async (req, res) => {
  try {
    const { siteId, currentPeriodStart, currentPeriodEnd } = req.query;

    const variance = await analyticsService.getCostVariance(
      siteId as string,
      currentPeriodStart ? new Date(currentPeriodStart as string) : undefined,
      currentPeriodEnd ? new Date(currentPeriodEnd as string) : undefined
    );

    res.json(variance);
  } catch (error) {
    console.error('Get cost variance error:', error);
    res.status(500).json({
      error: 'Failed to get cost variance',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/analytics/costs/by-asset:
 *   get:
 *     summary: Get cost per asset
 *     tags: [Cost Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: siteId
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Cost per asset
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   assetId:
 *                     type: string
 *                   assetName:
 *                     type: string
 *                   totalCost:
 *                     type: number
 *                   woCount:
 *                     type: integer
 *                   avgCostPerWO:
 *                     type: number
 *                   lastMaintenanceDate:
 *                     type: string
 *                     format: date-time
 */
router.get('/by-asset', authenticateToken, async (req, res) => {
  try {
    const { siteId, startDate, endDate } = req.query;

    const costPerAsset = await analyticsService.getCostPerAsset(
      siteId as string,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json({
      count: costPerAsset.length,
      assets: costPerAsset,
    });
  } catch (error) {
    console.error('Get cost per asset error:', error);
    res.status(500).json({
      error: 'Failed to get cost per asset',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/analytics/costs/breakdown:
 *   get:
 *     summary: Get category-wise cost breakdown
 *     tags: [Cost Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: siteId
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Cost breakdown
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 labor:
 *                   type: object
 *                   properties:
 *                     amount:
 *                       type: number
 *                     percentage:
 *                       type: number
 *                 parts:
 *                   type: object
 *                 equipment:
 *                   type: object
 *                 other:
 *                   type: object
 *                 total:
 *                   type: number
 */
router.get('/breakdown', authenticateToken, async (req, res) => {
  try {
    const { siteId, startDate, endDate } = req.query;

    const breakdown = await analyticsService.getCostBreakdown(
      siteId as string,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json(breakdown);
  } catch (error) {
    console.error('Get cost breakdown error:', error);
    res.status(500).json({
      error: 'Failed to get cost breakdown',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/analytics/costs/export:
 *   post:
 *     summary: Export cost data (CSV, PDF, Excel)
 *     tags: [Cost Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *               - options
 *             properties:
 *               query:
 *                 type: object
 *                 properties:
 *                   siteId:
 *                     type: string
 *                   startDate:
 *                     type: string
 *                     format: date
 *                   endDate:
 *                     type: string
 *                     format: date
 *                   groupBy:
 *                     type: string
 *                     enum: [site, asset, wo_type, category, month]
 *               options:
 *                 type: object
 *                 properties:
 *                   format:
 *                     type: string
 *                     enum: [csv, pdf, excel]
 *                   includeBreakdown:
 *                     type: boolean
 *                   includeTrends:
 *                     type: boolean
 *                   includeComparison:
 *                     type: boolean
 *     responses:
 *       200:
 *         description: Export file
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 */
router.post('/export', authenticateToken, async (req, res) => {
  try {
    const { query, options } = req.body;

    if (!query || !options) {
      return res.status(400).json({
        error: 'query and options are required',
      });
    }

    const costQuery: CostAnalyticsQuery = {
      ...query,
      startDate: new Date(query.startDate),
      endDate: new Date(query.endDate),
    };

    const exportOptions: CostExportOptions = options;

    const exportData = await analyticsService.exportCostData(costQuery, exportOptions);

    // Set headers for download
    res.setHeader('Content-Type', exportData.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${exportData.filename}"`
    );

    res.send(exportData.data);
  } catch (error) {
    console.error('Export cost data error:', error);
    res.status(500).json({
      error: 'Failed to export cost data',
      details: error.message,
    });
  }
});

export default router;
