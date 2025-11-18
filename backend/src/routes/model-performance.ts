import { Router } from 'express';
import { ModelPerformanceService, GroundTruthRecord } from '../services/model-performance.service';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const performanceService = new ModelPerformanceService();

/**
 * @swagger
 * tags:
 *   name: Model Performance
 *   description: Model performance tracking and monitoring
 */

/**
 * @swagger
 * /api/v1/model-performance/ground-truth:
 *   post:
 *     summary: Record ground truth (actual failure/no failure)
 *     tags: [Model Performance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assetId
 *               - failureOccurred
 *               - recordedBy
 *             properties:
 *               assetId:
 *                 type: string
 *                 example: "asset_123"
 *               failureOccurred:
 *                 type: boolean
 *                 description: Did the asset actually fail?
 *                 example: true
 *               failureDate:
 *                 type: string
 *                 format: date-time
 *                 description: When the failure occurred (if applicable)
 *               workOrderId:
 *                 type: string
 *                 description: Associated work order ID
 *               failureType:
 *                 type: string
 *                 example: "mechanical_failure"
 *               recordedBy:
 *                 type: string
 *                 example: "technician_456"
 *     responses:
 *       200:
 *         description: Ground truth recorded successfully
 *       400:
 *         description: Invalid request
 */
router.post('/ground-truth', authenticateToken, async (req, res) => {
  try {
    const {
      assetId,
      failureOccurred,
      failureDate,
      workOrderId,
      failureType,
      recordedBy,
    } = req.body;

    if (!assetId) {
      return res.status(400).json({ error: 'assetId is required' });
    }

    if (typeof failureOccurred !== 'boolean') {
      return res.status(400).json({ error: 'failureOccurred must be a boolean' });
    }

    if (!recordedBy) {
      return res.status(400).json({ error: 'recordedBy is required' });
    }

    const groundTruth: GroundTruthRecord = {
      assetId,
      failureOccurred,
      failureDate: failureDate ? new Date(failureDate) : undefined,
      workOrderId,
      failureType,
      recordedBy,
      timestamp: new Date(),
    };

    await performanceService.recordGroundTruth(groundTruth);

    res.json({
      message: 'Ground truth recorded successfully',
      groundTruth,
    });
  } catch (error) {
    console.error('Record ground truth error:', error);
    res.status(500).json({
      error: 'Failed to record ground truth',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/model-performance/evaluate-overdue:
 *   post:
 *     summary: Evaluate overdue predictions (assume no failure if no ground truth)
 *     tags: [Model Performance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Overdue predictions evaluated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 evaluated:
 *                   type: integer
 *                 assumedNoFailure:
 *                   type: integer
 */
router.post('/evaluate-overdue', authenticateToken, async (req, res) => {
  try {
    const result = await performanceService.evaluateOverduePredictions();

    res.json({
      message: 'Overdue predictions evaluated',
      ...result,
    });
  } catch (error) {
    console.error('Evaluate overdue error:', error);
    res.status(500).json({
      error: 'Failed to evaluate overdue predictions',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/model-performance/metrics/{modelName}:
 *   get:
 *     summary: Calculate model performance metrics
 *     tags: [Model Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: modelName
 *         required: true
 *         schema:
 *           type: string
 *         description: Model name
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for metrics calculation
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for metrics calculation
 *     responses:
 *       200:
 *         description: Model metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 modelName:
 *                   type: string
 *                 modelVersion:
 *                   type: string
 *                 evaluationPeriod:
 *                   type: object
 *                   properties:
 *                     start:
 *                       type: string
 *                       format: date-time
 *                     end:
 *                       type: string
 *                       format: date-time
 *                 totalPredictions:
 *                   type: integer
 *                 evaluatedPredictions:
 *                   type: integer
 *                 truePositives:
 *                   type: integer
 *                 trueNegatives:
 *                   type: integer
 *                 falsePositives:
 *                   type: integer
 *                 falseNegatives:
 *                   type: integer
 *                 precision:
 *                   type: number
 *                 recall:
 *                   type: number
 *                 f1Score:
 *                   type: number
 *                 accuracy:
 *                   type: number
 *       400:
 *         description: Not enough predictions for metrics
 */
router.get('/metrics/:modelName', authenticateToken, async (req, res) => {
  try {
    const { modelName } = req.params;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const metrics = await performanceService.calculateMetrics(
      modelName,
      start,
      end
    );

    res.json(metrics);
  } catch (error) {
    console.error('Calculate metrics error:', error);

    if (error.message.includes('Not enough')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({
      error: 'Failed to calculate metrics',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/model-performance/metrics/{modelName}/history:
 *   get:
 *     summary: Get model metrics history
 *     tags: [Model Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: modelName
 *         required: true
 *         schema:
 *           type: string
 *         description: Model name
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of history items
 *     responses:
 *       200:
 *         description: Metrics history
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get('/metrics/:modelName/history', authenticateToken, async (req, res) => {
  try {
    const { modelName } = req.params;
    const { limit } = req.query;

    const limitNum = limit ? parseInt(limit as string, 10) : 10;

    const history = await performanceService.getMetricsHistory(
      modelName,
      limitNum
    );

    res.json({
      modelName,
      count: history.length,
      history,
    });
  } catch (error) {
    console.error('Get metrics history error:', error);
    res.status(500).json({
      error: 'Failed to get metrics history',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/model-performance/compare:
 *   post:
 *     summary: Compare model versions
 *     tags: [Model Performance]
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
 *               - currentVersion
 *             properties:
 *               modelName:
 *                 type: string
 *                 example: "predictive_maintenance"
 *               currentVersion:
 *                 type: string
 *                 example: "v2.1.0"
 *               previousVersion:
 *                 type: string
 *                 description: Optional - if not provided, uses latest previous version
 *                 example: "v2.0.0"
 *     responses:
 *       200:
 *         description: Model comparison
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 currentModel:
 *                   type: object
 *                 previousModel:
 *                   type: object
 *                 changes:
 *                   type: object
 *                   properties:
 *                     precision:
 *                       type: number
 *                     recall:
 *                       type: number
 *                     f1Score:
 *                       type: number
 *                     accuracy:
 *                       type: number
 *                 recommendation:
 *                   type: string
 *       404:
 *         description: Model version not found
 */
router.post('/compare', authenticateToken, async (req, res) => {
  try {
    const { modelName, currentVersion, previousVersion } = req.body;

    if (!modelName) {
      return res.status(400).json({ error: 'modelName is required' });
    }

    if (!currentVersion) {
      return res.status(400).json({ error: 'currentVersion is required' });
    }

    const comparison = await performanceService.compareModelVersions(
      modelName,
      currentVersion,
      previousVersion
    );

    res.json(comparison);
  } catch (error) {
    console.error('Compare models error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({
      error: 'Failed to compare model versions',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/model-performance/alerts:
 *   get:
 *     summary: Get active performance alerts
 *     tags: [Model Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: modelName
 *         schema:
 *           type: string
 *         description: Filter by model name
 *     responses:
 *       200:
 *         description: Active alerts
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
 *                       alertId:
 *                         type: string
 *                       modelName:
 *                         type: string
 *                       modelVersion:
 *                         type: string
 *                       metric:
 *                         type: string
 *                       currentValue:
 *                         type: number
 *                       previousValue:
 *                         type: number
 *                       severity:
 *                         type: string
 *                       message:
 *                         type: string
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 */
router.get('/alerts', authenticateToken, async (req, res) => {
  try {
    const { modelName } = req.query;

    const alerts = await performanceService.getActiveAlerts(
      modelName as string | undefined
    );

    res.json({
      count: alerts.length,
      alerts,
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({
      error: 'Failed to get alerts',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/model-performance/alerts/{alertId}/acknowledge:
 *   post:
 *     summary: Acknowledge a performance alert
 *     tags: [Model Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: alertId
 *         required: true
 *         schema:
 *           type: string
 *         description: Alert ID
 *     responses:
 *       200:
 *         description: Alert acknowledged
 *       404:
 *         description: Alert not found
 */
router.post('/alerts/:alertId/acknowledge', authenticateToken, async (req, res) => {
  try {
    const { alertId } = req.params;

    await performanceService.acknowledgeAlert(alertId);

    res.json({
      message: 'Alert acknowledged successfully',
      alertId,
    });
  } catch (error) {
    console.error('Acknowledge alert error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({
      error: 'Failed to acknowledge alert',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/model-performance/accuracy-by-risk/{modelName}:
 *   get:
 *     summary: Get prediction accuracy breakdown by risk level
 *     tags: [Model Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: modelName
 *         required: true
 *         schema:
 *           type: string
 *         description: Model name
 *     responses:
 *       200:
 *         description: Accuracy by risk level
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 highRisk:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     correct:
 *                       type: integer
 *                     accuracy:
 *                       type: number
 *                 mediumRisk:
 *                   type: object
 *                 lowRisk:
 *                   type: object
 */
router.get('/accuracy-by-risk/:modelName', authenticateToken, async (req, res) => {
  try {
    const { modelName } = req.params;

    const accuracy = await performanceService.getPredictionAccuracyByRisk(
      modelName
    );

    res.json({
      modelName,
      ...accuracy,
    });
  } catch (error) {
    console.error('Get accuracy by risk error:', error);
    res.status(500).json({
      error: 'Failed to get accuracy by risk',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/model-performance/stats/{modelName}:
 *   get:
 *     summary: Get prediction statistics
 *     tags: [Model Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: modelName
 *         required: true
 *         schema:
 *           type: string
 *         description: Model name
 *     responses:
 *       200:
 *         description: Prediction statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalPredictions:
 *                   type: integer
 *                 evaluatedPredictions:
 *                   type: integer
 *                 pendingEvaluation:
 *                   type: integer
 *                 evaluationRate:
 *                   type: number
 */
router.get('/stats/:modelName', authenticateToken, async (req, res) => {
  try {
    const { modelName } = req.params;

    const stats = await performanceService.getPredictionStats(modelName);

    res.json({
      modelName,
      ...stats,
    });
  } catch (error) {
    console.error('Get prediction stats error:', error);
    res.status(500).json({
      error: 'Failed to get prediction stats',
      details: error.message,
    });
  }
});

export default router;
