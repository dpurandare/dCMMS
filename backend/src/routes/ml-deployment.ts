import { Router } from 'express';
import { MLDeploymentService, ModelDeploymentConfig } from '../services/ml-deployment.service';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();
const deploymentService = new MLDeploymentService();

/**
 * @swagger
 * tags:
 *   name: ML Deployment
 *   description: Model deployment and management endpoints
 */

/**
 * @swagger
 * /api/v1/ml/models/{modelName}/deploy:
 *   post:
 *     summary: Deploy model to serving infrastructure
 *     tags: [ML Deployment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: modelName
 *         required: true
 *         schema:
 *           type: string
 *         description: Model name
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - modelVersion
 *               - modelUri
 *             properties:
 *               modelVersion:
 *                 type: string
 *                 example: "1.0"
 *               modelUri:
 *                 type: string
 *                 example: "models:/predictive_maintenance_best/Production"
 *               replicas:
 *                 type: integer
 *                 example: 2
 *               minReplicas:
 *                 type: integer
 *                 example: 1
 *               maxReplicas:
 *                 type: integer
 *                 example: 5
 *               canaryPercent:
 *                 type: integer
 *                 example: 10
 *               resources:
 *                 type: object
 *                 properties:
 *                   requests:
 *                     type: object
 *                     properties:
 *                       cpu:
 *                         type: string
 *                         example: "1"
 *                       memory:
 *                         type: string
 *                         example: "2Gi"
 *                   limits:
 *                     type: object
 *                     properties:
 *                       cpu:
 *                         type: string
 *                         example: "2"
 *                       memory:
 *                         type: string
 *                         example: "4Gi"
 *     responses:
 *       200:
 *         description: Model deployed successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (admin only)
 */
router.post(
  '/:modelName/deploy',
  authenticateToken,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { modelName } = req.params;
      const config: ModelDeploymentConfig = {
        modelName,
        ...req.body,
      };

      const deployment = await deploymentService.deployModel(config);

      res.json({
        message: 'Model deployed successfully',
        deployment,
      });
    } catch (error) {
      console.error('Deploy error:', error);
      res.status(error.status || 500).json({
        error: error.message || 'Failed to deploy model',
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/ml/models/{modelName}/status:
 *   get:
 *     summary: Get deployment status
 *     tags: [ML Deployment]
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
 *         description: Deployment status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 modelName:
 *                   type: string
 *                 modelVersion:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [deploying, ready, failed, not_found]
 *                 replicas:
 *                   type: integer
 *                 availableReplicas:
 *                   type: integer
 *                 url:
 *                   type: string
 *                 health:
 *                   type: object
 *                   properties:
 *                     liveness:
 *                       type: boolean
 *                     readiness:
 *                       type: boolean
 *                 lastUpdated:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Model not found
 */
router.get('/:modelName/status', authenticateToken, async (req, res) => {
  try {
    const { modelName } = req.params;

    const status = await deploymentService.getDeploymentStatus(modelName);

    res.json(status);
  } catch (error) {
    console.error('Status error:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Failed to get deployment status',
    });
  }
});

/**
 * @swagger
 * /api/v1/ml/models/{modelName}/undeploy:
 *   delete:
 *     summary: Undeploy model from serving infrastructure
 *     tags: [ML Deployment]
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
 *         description: Model undeployed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (admin only)
 *       404:
 *         description: Model not found
 */
router.delete(
  '/:modelName/undeploy',
  authenticateToken,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { modelName } = req.params;

      await deploymentService.undeployModel(modelName);

      res.json({
        message: 'Model undeployed successfully',
        modelName,
      });
    } catch (error) {
      console.error('Undeploy error:', error);
      res.status(error.status || 500).json({
        error: error.message || 'Failed to undeploy model',
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/ml/models/{modelName}/rollback:
 *   post:
 *     summary: Rollback to previous model version
 *     tags: [ML Deployment]
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
 *         description: Model rolled back successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (admin only)
 *       404:
 *         description: Model not found
 */
router.post(
  '/:modelName/rollback',
  authenticateToken,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { modelName } = req.params;

      const deployment = await deploymentService.rollbackModel(modelName);

      res.json({
        message: 'Model rolled back successfully',
        deployment,
      });
    } catch (error) {
      console.error('Rollback error:', error);
      res.status(error.status || 500).json({
        error: error.message || 'Failed to rollback model',
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/ml/models:
 *   get:
 *     summary: List all deployed models
 *     tags: [ML Deployment]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of deployed models
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 deployments:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const deployments = await deploymentService.listDeployments();

    res.json({
      deployments,
      count: deployments.length,
    });
  } catch (error) {
    console.error('List deployments error:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Failed to list deployments',
    });
  }
});

export default router;
