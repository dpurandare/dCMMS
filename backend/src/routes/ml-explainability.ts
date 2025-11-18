import { Router } from 'express';
import { MLExplainabilityService, ExplanationRequest } from '../services/ml-explainability.service';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const explainabilityService = new MLExplainabilityService();

/**
 * @swagger
 * tags:
 *   name: ML Explainability
 *   description: Model explainability and SHAP endpoints
 */

/**
 * @swagger
 * /api/v1/ml/explain:
 *   post:
 *     summary: Get SHAP explanation for asset prediction
 *     tags: [ML Explainability]
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
 *               - assetId
 *             properties:
 *               modelName:
 *                 type: string
 *                 example: "predictive_maintenance"
 *               assetId:
 *                 type: string
 *                 example: "asset_123"
 *               topN:
 *                 type: integer
 *                 example: 10
 *                 description: Number of top features to return
 *     responses:
 *       200:
 *         description: SHAP explanation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 assetId:
 *                   type: string
 *                 prediction:
 *                   type: integer
 *                 probability:
 *                   type: number
 *                 baseValue:
 *                   type: number
 *                   description: Model's base prediction value
 *                 topFeatures:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       feature:
 *                         type: string
 *                       value:
 *                         type: number
 *                       shapValue:
 *                         type: number
 *                         description: SHAP contribution to prediction
 *                       absShap:
 *                         type: number
 *                 modelName:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 latencyMs:
 *                   type: number
 *       400:
 *         description: Invalid request
 *       503:
 *         description: Explainer service unavailable
 */
router.post('/explain', authenticateToken, async (req, res) => {
  try {
    const request: ExplanationRequest = {
      modelName: req.body.modelName,
      assetId: req.body.assetId,
      topN: req.body.topN || 10,
    };

    if (!request.modelName) {
      return res.status(400).json({
        error: 'modelName is required',
      });
    }

    if (!request.assetId) {
      return res.status(400).json({
        error: 'assetId is required',
      });
    }

    const explanation = await explainabilityService.explainPrediction(request);

    // Add recommendation
    const recommendation = explainabilityService.getRecommendation(explanation);

    res.json({
      ...explanation,
      recommendation,
    });
  } catch (error) {
    console.error('Explanation error:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Failed to generate explanation',
    });
  }
});

/**
 * @swagger
 * /api/v1/ml/explain/waterfall/{assetId}:
 *   get:
 *     summary: Get waterfall plot data for visualization
 *     tags: [ML Explainability]
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
 *     responses:
 *       200:
 *         description: Waterfall plot data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 assetId:
 *                   type: string
 *                 baseValue:
 *                   type: number
 *                 features:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       feature:
 *                         type: string
 *                       value:
 *                         type: number
 *                       shapValue:
 *                         type: number
 *                 finalValue:
 *                   type: number
 *       400:
 *         description: Invalid request
 *       503:
 *         description: Explainer service unavailable
 */
router.get('/explain/waterfall/:assetId', authenticateToken, async (req, res) => {
  try {
    const { assetId } = req.params;
    const modelName = req.query.modelName as string;

    if (!modelName) {
      return res.status(400).json({
        error: 'modelName query parameter is required',
      });
    }

    const waterfallData = await explainabilityService.getWaterfallData(modelName, assetId);

    res.json(waterfallData);
  } catch (error) {
    console.error('Waterfall error:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Failed to get waterfall data',
    });
  }
});

/**
 * @swagger
 * /api/v1/ml/explain/feature-importance:
 *   post:
 *     summary: Get feature importance summary across multiple assets
 *     tags: [ML Explainability]
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
 *               assetIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               topN:
 *                 type: integer
 *                 default: 10
 *     responses:
 *       200:
 *         description: Feature importance summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 topFeatures:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       feature:
 *                         type: string
 *                       meanAbsShap:
 *                         type: number
 *                 numSamples:
 *                   type: integer
 *                 modelName:
 *                   type: string
 *       400:
 *         description: Invalid request
 */
router.post('/explain/feature-importance', authenticateToken, async (req, res) => {
  try {
    const { modelName, assetIds, topN } = req.body;

    if (!modelName) {
      return res.status(400).json({
        error: 'modelName is required',
      });
    }

    if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
      return res.status(400).json({
        error: 'assetIds must be a non-empty array',
      });
    }

    // Limit to reasonable number
    if (assetIds.length > 100) {
      return res.status(400).json({
        error: 'Maximum 100 assets allowed for feature importance',
      });
    }

    const importance = await explainabilityService.getFeatureImportance(
      modelName,
      assetIds,
      topN || 10
    );

    res.json(importance);
  } catch (error) {
    console.error('Feature importance error:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Failed to get feature importance',
    });
  }
});

export default router;
