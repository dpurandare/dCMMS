import { Router } from 'express';
import { MLInferenceService, PredictionRequest } from '../services/ml-inference.service';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const inferenceService = new MLInferenceService();

/**
 * @swagger
 * tags:
 *   name: ML Inference
 *   description: Model inference and prediction endpoints
 */

/**
 * @swagger
 * /api/v1/ml/predict:
 *   post:
 *     summary: Batch prediction for multiple assets
 *     tags: [ML Inference]
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
 *               - assetIds
 *             properties:
 *               modelName:
 *                 type: string
 *                 example: "predictive_maintenance"
 *               assetIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["asset_1", "asset_2", "asset_3"]
 *               useCache:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Predictions generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 predictions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       assetId:
 *                         type: string
 *                       failureProbability:
 *                         type: number
 *                         format: float
 *                       riskLevel:
 *                         type: string
 *                         enum: [low, medium, high]
 *                       predicted:
 *                         type: boolean
 *                       confidence:
 *                         type: number
 *                         format: float
 *                 modelName:
 *                   type: string
 *                 modelVersion:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 latencyMs:
 *                   type: number
 *       400:
 *         description: Invalid request
 *       503:
 *         description: Model server unavailable
 */
router.post('/predict', authenticateToken, async (req, res) => {
  try {
    const request: PredictionRequest = {
      modelName: req.body.modelName,
      assetIds: req.body.assetIds,
      useCache: req.body.useCache !== false,
    };

    // Validate request
    if (!request.modelName) {
      return res.status(400).json({
        error: 'modelName is required',
      });
    }

    if (!request.assetIds || !Array.isArray(request.assetIds) || request.assetIds.length === 0) {
      return res.status(400).json({
        error: 'assetIds must be a non-empty array',
      });
    }

    // Limit batch size
    if (request.assetIds.length > 1000) {
      return res.status(400).json({
        error: 'Maximum batch size is 1000 assets',
      });
    }

    const response = await inferenceService.batchPredict(request);

    res.json(response);
  } catch (error) {
    console.error('Prediction error:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Prediction failed',
    });
  }
});

/**
 * @swagger
 * /api/v1/ml/predict/asset/{assetId}:
 *   get:
 *     summary: Single asset prediction
 *     tags: [ML Inference]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assetId
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *       - in: query
 *         name: modelName
 *         required: true
 *         schema:
 *           type: string
 *         description: Model name
 *       - in: query
 *         name: useCache
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Use cached prediction if available
 *     responses:
 *       200:
 *         description: Prediction for single asset
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 assetId:
 *                   type: string
 *                 failureProbability:
 *                   type: number
 *                 riskLevel:
 *                   type: string
 *                 predicted:
 *                   type: boolean
 *                 confidence:
 *                   type: number
 *       400:
 *         description: Invalid request
 *       503:
 *         description: Model server unavailable
 */
router.get('/predict/asset/:assetId', authenticateToken, async (req, res) => {
  try {
    const { assetId } = req.params;
    const modelName = req.query.modelName as string;
    const useCache = req.query.useCache !== 'false';

    if (!modelName) {
      return res.status(400).json({
        error: 'modelName query parameter is required',
      });
    }

    const prediction = await inferenceService.predictSingle(modelName, assetId, useCache);

    res.json(prediction);
  } catch (error) {
    console.error('Prediction error:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Prediction failed',
    });
  }
});

/**
 * @swagger
 * /api/v1/ml/predict/all:
 *   get:
 *     summary: Predict all assets
 *     tags: [ML Inference]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: modelName
 *         required: true
 *         schema:
 *           type: string
 *         description: Model name
 *       - in: query
 *         name: riskLevel
 *         schema:
 *           type: string
 *           enum: [low, medium, high]
 *         description: Filter by risk level
 *     responses:
 *       200:
 *         description: Predictions for all assets
 *       400:
 *         description: Invalid request
 *       503:
 *         description: Model server unavailable
 */
router.get('/predict/all', authenticateToken, async (req, res) => {
  try {
    const modelName = req.query.modelName as string;
    const riskLevel = req.query.riskLevel as 'low' | 'medium' | 'high' | undefined;

    if (!modelName) {
      return res.status(400).json({
        error: 'modelName query parameter is required',
      });
    }

    const response = await inferenceService.predictAllAssets(modelName, riskLevel);

    res.json(response);
  } catch (error) {
    console.error('Prediction error:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Prediction failed',
    });
  }
});

/**
 * @swagger
 * /api/v1/ml/predictions/logs:
 *   get:
 *     summary: Get prediction logs for drift monitoring
 *     tags: [ML Inference]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 1000
 *         description: Maximum number of logs to return
 *     responses:
 *       200:
 *         description: Prediction logs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 logs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       assetId:
 *                         type: string
 *                       modelName:
 *                         type: string
 *                       modelVersion:
 *                         type: string
 *                       failureProbability:
 *                         type: number
 *                       predicted:
 *                         type: boolean
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                 count:
 *                   type: integer
 */
router.get('/predictions/logs', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 1000;

    const logs = inferenceService.getPredictionLogs(limit);

    res.json({
      logs,
      count: logs.length,
    });
  } catch (error) {
    console.error('Logs error:', error);
    res.status(500).json({
      error: error.message || 'Failed to get prediction logs',
    });
  }
});

/**
 * @swagger
 * /api/v1/ml/predictions/cache/clear:
 *   post:
 *     summary: Clear prediction cache
 *     tags: [ML Inference]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cache cleared successfully
 */
router.post('/predictions/cache/clear', authenticateToken, async (req, res) => {
  try {
    inferenceService.clearCache();

    res.json({
      message: 'Prediction cache cleared successfully',
    });
  } catch (error) {
    console.error('Cache clear error:', error);
    res.status(500).json({
      error: error.message || 'Failed to clear cache',
    });
  }
});

export default router;
