import { Router } from 'express';
import { PredictiveWOService } from '../services/predictive-wo.service';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();
const predictiveWOService = new PredictiveWOService();

/**
 * @swagger
 * tags:
 *   name: Predictive Work Orders
 *   description: Predictive maintenance work order endpoints
 */

/**
 * @swagger
 * /api/v1/predictive-wo/run:
 *   post:
 *     summary: Manually trigger predictive maintenance job
 *     tags: [Predictive Work Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               modelName:
 *                 type: string
 *                 example: "predictive_maintenance"
 *                 default: "predictive_maintenance"
 *     responses:
 *       200:
 *         description: Job completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalCreated:
 *                       type: integer
 *                     highRisk:
 *                       type: integer
 *                     criticalRisk:
 *                       type: integer
 *                     deduplicatedCount:
 *                       type: integer
 *                     notificationsSent:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (admin only)
 */
router.post(
  '/run',
  authenticateToken,
  requireRole('admin'),
  async (req, res) => {
    try {
      const modelName = req.body.modelName || 'predictive_maintenance';

      const stats = await predictiveWOService.runPredictiveMaintenanceJob(modelName);

      res.json({
        message: 'Predictive maintenance job completed successfully',
        stats,
      });
    } catch (error) {
      console.error('Predictive WO job error:', error);
      res.status(500).json({
        error: error.message || 'Failed to run predictive maintenance job',
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/predictive-wo/stats:
 *   get:
 *     summary: Get predictive work order statistics
 *     tags: [Predictive Work Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for stats
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for stats
 *     responses:
 *       200:
 *         description: Statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalPredictiveWOs:
 *                   type: integer
 *                 pending:
 *                   type: integer
 *                 approved:
 *                   type: integer
 *                 rejected:
 *                   type: integer
 *                 completed:
 *                   type: integer
 *                 approvalRate:
 *                   type: number
 *                 avgTimeToApproval:
 *                   type: number
 *                   description: Average time in hours
 *                 truePositives:
 *                   type: integer
 *                 falsePositives:
 *                   type: integer
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const stats = await predictiveWOService.getStats(startDate, endDate);

    res.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      error: error.message || 'Failed to get statistics',
    });
  }
});

/**
 * @swagger
 * /api/v1/predictive-wo/cleanup:
 *   post:
 *     summary: Cleanup deduplication cache
 *     tags: [Predictive Work Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cache cleaned up
 */
router.post(
  '/cleanup',
  authenticateToken,
  requireRole('admin'),
  async (req, res) => {
    try {
      predictiveWOService.cleanupDeduplicationCache();

      res.json({
        message: 'Deduplication cache cleaned up successfully',
      });
    } catch (error) {
      console.error('Cleanup error:', error);
      res.status(500).json({
        error: error.message || 'Failed to cleanup cache',
      });
    }
  }
);

export default router;
