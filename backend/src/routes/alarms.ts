/**
 * Alarms API (DCMMS-075)
 *
 * Endpoints:
 * - GET /api/v1/alarms - List alarms
 * - GET /api/v1/alarms/:id - Get alarm details
 * - POST /api/v1/alarms/:id/acknowledge - Acknowledge alarm
 * - POST /api/v1/alarms/:id/resolve - Resolve alarm
 * - POST /api/v1/alarms/:id/comment - Add comment to alarm
 * - GET /api/v1/alarms/active - Get active alarms
 * - GET /api/v1/alarms/stats - Get alarm statistics
 */

import express, { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { db } from '../db';

const router = express.Router();

// ==========================================
// Validation Middleware
// ==========================================

const handleValidationErrors = (req: Request, res: Response, next: Function) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// ==========================================
// Alarm Query Routes
// ==========================================

/**
 * GET /api/v1/alarms
 * List alarms with filters
 */
router.get(
  '/',
  [
    query('status').optional().isIn(['active', 'acknowledged', 'resolved']),
    query('severity').optional().isIn(['INFO', 'WARNING', 'CRITICAL']),
    query('siteId').optional().isUUID(),
    query('assetId').optional().isUUID(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || 'default-tenant';
      const {
        status,
        severity,
        siteId,
        assetId,
        startDate,
        endDate,
        limit = 50,
        offset = 0,
      } = req.query;

      // Build query
      let query = `
        SELECT
          a.id,
          a.alarm_type AS "alarmType",
          a.severity,
          a.status,
          a.site_id AS "siteId",
          a.asset_id AS "assetId",
          a.sensor_type AS "sensorType",
          a.value,
          a.unit,
          a.threshold_violated AS "thresholdViolated",
          a.message,
          a.first_occurrence AS "firstOccurrence",
          a.last_occurrence AS "lastOccurrence",
          a.acknowledged_at AS "acknowledgedAt",
          a.acknowledged_by AS "acknowledgedBy",
          a.resolved_at AS "resolvedAt",
          a.resolved_by AS "resolvedBy",
          s.name AS "siteName",
          ast.name AS "assetName",
          u_ack.email AS "acknowledgedByEmail",
          u_res.email AS "resolvedByEmail"
        FROM alarms a
        LEFT JOIN sites s ON a.site_id = s.id
        LEFT JOIN assets ast ON a.asset_id = ast.id
        LEFT JOIN users u_ack ON a.acknowledged_by = u_ack.id
        LEFT JOIN users u_res ON a.resolved_by = u_res.id
        WHERE a.tenant_id = $1
      `;

      const params: any[] = [tenantId];
      let paramCount = 2;

      if (status) {
        query += ` AND a.status = $${paramCount++}`;
        params.push(status.toUpperCase());
      }

      if (severity) {
        query += ` AND a.severity = $${paramCount++}`;
        params.push(severity);
      }

      if (siteId) {
        query += ` AND a.site_id = $${paramCount++}`;
        params.push(siteId);
      }

      if (assetId) {
        query += ` AND a.asset_id = $${paramCount++}`;
        params.push(assetId);
      }

      if (startDate) {
        query += ` AND a.first_occurrence >= $${paramCount++}`;
        params.push(startDate);
      }

      if (endDate) {
        query += ` AND a.first_occurrence <= $${paramCount++}`;
        params.push(endDate);
      }

      query += ` ORDER BY a.first_occurrence DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
      params.push(limit, offset);

      const result = await db.query(query, params);

      // Get total count
      let countQuery = 'SELECT COUNT(*) FROM alarms a WHERE a.tenant_id = $1';
      const countParams: any[] = [tenantId];
      let countParamIndex = 2;

      if (status) {
        countQuery += ` AND a.status = $${countParamIndex++}`;
        countParams.push(status.toUpperCase());
      }
      if (severity) {
        countQuery += ` AND a.severity = $${countParamIndex++}`;
        countParams.push(severity);
      }
      if (siteId) {
        countQuery += ` AND a.site_id = $${countParamIndex++}`;
        countParams.push(siteId);
      }
      if (assetId) {
        countQuery += ` AND a.asset_id = $${countParamIndex++}`;
        countParams.push(assetId);
      }
      if (startDate) {
        countQuery += ` AND a.first_occurrence >= $${countParamIndex++}`;
        countParams.push(startDate);
      }
      if (endDate) {
        countQuery += ` AND a.first_occurrence <= $${countParamIndex++}`;
        countParams.push(endDate);
      }

      const countResult = await db.query(countQuery, countParams);

      res.json({
        success: true,
        alarms: result.rows,
        total: parseInt(countResult.rows[0].count),
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });
    } catch (error: any) {
      console.error('Error listing alarms:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list alarms',
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/v1/alarms/active
 * Get active alarms (not acknowledged or resolved)
 */
router.get('/active', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] || 'default-tenant';

    const result = await db.query(
      `
      SELECT
        a.id,
        a.severity,
        a.alarm_type AS "alarmType",
        a.site_id AS "siteId",
        a.asset_id AS "assetId",
        a.sensor_type AS "sensorType",
        a.value,
        a.unit,
        a.message,
        a.first_occurrence AS "firstOccurrence",
        a.last_occurrence AS "lastOccurrence",
        s.name AS "siteName",
        ast.name AS "assetName"
      FROM alarms a
      LEFT JOIN sites s ON a.site_id = s.id
      LEFT JOIN assets ast ON a.asset_id = ast.id
      WHERE a.tenant_id = $1
        AND a.status = 'ACTIVE'
      ORDER BY
        CASE a.severity
          WHEN 'CRITICAL' THEN 1
          WHEN 'WARNING' THEN 2
          WHEN 'INFO' THEN 3
        END,
        a.first_occurrence DESC
    `,
      [tenantId]
    );

    res.json({
      success: true,
      alarms: result.rows,
      count: result.rows.length,
    });
  } catch (error: any) {
    console.error('Error getting active alarms:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get active alarms',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/alarms/:id
 * Get alarm details
 */
router.get('/:id', param('id').isUUID(), handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.headers['x-tenant-id'] || 'default-tenant';

    const result = await db.query(
      `
      SELECT
        a.id,
        a.alarm_rule_id AS "alarmRuleId",
        a.alarm_type AS "alarmType",
        a.severity,
        a.status,
        a.site_id AS "siteId",
        a.asset_id AS "assetId",
        a.sensor_type AS "sensorType",
        a.sensor_id AS "sensorId",
        a.value,
        a.unit,
        a.threshold_violated AS "thresholdViolated",
        a.message,
        a.first_occurrence AS "firstOccurrence",
        a.last_occurrence AS "lastOccurrence",
        a.occurrence_count AS "occurrenceCount",
        a.acknowledged_at AS "acknowledgedAt",
        a.acknowledged_by AS "acknowledgedBy",
        a.resolved_at AS "resolvedAt",
        a.resolved_by AS "resolvedBy",
        a.metadata,
        s.name AS "siteName",
        ast.name AS "assetName",
        u_ack.email AS "acknowledgedByEmail",
        u_ack.first_name AS "acknowledgedByFirstName",
        u_ack.last_name AS "acknowledgedByLastName",
        u_res.email AS "resolvedByEmail",
        u_res.first_name AS "resolvedByFirstName",
        u_res.last_name AS "resolvedByLastName"
      FROM alarms a
      LEFT JOIN sites s ON a.site_id = s.id
      LEFT JOIN assets ast ON a.asset_id = ast.id
      LEFT JOIN users u_ack ON a.acknowledged_by = u_ack.id
      LEFT JOIN users u_res ON a.resolved_by = u_res.id
      WHERE a.id = $1 AND a.tenant_id = $2
    `,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Alarm not found',
      });
    }

    res.json({
      success: true,
      alarm: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error getting alarm:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get alarm',
      message: error.message,
    });
  }
});

// ==========================================
// Alarm Action Routes
// ==========================================

/**
 * POST /api/v1/alarms/:id/acknowledge
 * Acknowledge alarm (stops escalation)
 */
router.post(
  '/:id/acknowledge',
  [
    param('id').isUUID(),
    body('comment').optional().isString(),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { comment } = req.body;
      const tenantId = req.headers['x-tenant-id'] || 'default-tenant';
      const userId = req.headers['x-user-id']; // From auth middleware

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User authentication required',
        });
      }

      // Check if alarm exists and belongs to tenant
      const alarmCheck = await db.query(
        'SELECT id, status, acknowledged_at FROM alarms WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );

      if (alarmCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Alarm not found',
        });
      }

      if (alarmCheck.rows[0].acknowledged_at) {
        return res.status(400).json({
          success: false,
          error: 'Alarm already acknowledged',
          acknowledgedAt: alarmCheck.rows[0].acknowledged_at,
        });
      }

      // Acknowledge alarm
      const result = await db.query(
        `
        UPDATE alarms
        SET
          status = 'ACKNOWLEDGED',
          acknowledged_at = NOW(),
          acknowledged_by = $1,
          metadata = jsonb_set(
            COALESCE(metadata, '{}'::jsonb),
            '{acknowledgment_comment}',
            to_jsonb($2::text)
          )
        WHERE id = $3 AND tenant_id = $4
        RETURNING
          id,
          status,
          acknowledged_at AS "acknowledgedAt",
          acknowledged_by AS "acknowledgedBy"
      `,
        [userId, comment || '', id, tenantId]
      );

      console.log(`Alarm ${id} acknowledged by user ${userId}`);

      res.json({
        success: true,
        alarm: result.rows[0],
        message: 'Alarm acknowledged successfully',
      });
    } catch (error: any) {
      console.error('Error acknowledging alarm:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to acknowledge alarm',
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/v1/alarms/:id/resolve
 * Resolve alarm (marks as resolved)
 */
router.post(
  '/:id/resolve',
  [
    param('id').isUUID(),
    body('comment').optional().isString(),
    body('rootCause').optional().isString(),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { comment, rootCause } = req.body;
      const tenantId = req.headers['x-tenant-id'] || 'default-tenant';
      const userId = req.headers['x-user-id'];

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User authentication required',
        });
      }

      // Check if alarm exists
      const alarmCheck = await db.query(
        'SELECT id, status, resolved_at FROM alarms WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );

      if (alarmCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Alarm not found',
        });
      }

      if (alarmCheck.rows[0].resolved_at) {
        return res.status(400).json({
          success: false,
          error: 'Alarm already resolved',
          resolvedAt: alarmCheck.rows[0].resolved_at,
        });
      }

      // Resolve alarm
      const result = await db.query(
        `
        UPDATE alarms
        SET
          status = 'RESOLVED',
          resolved_at = NOW(),
          resolved_by = $1,
          metadata = jsonb_set(
            jsonb_set(
              COALESCE(metadata, '{}'::jsonb),
              '{resolution_comment}',
              to_jsonb($2::text)
            ),
            '{root_cause}',
            to_jsonb($3::text)
          )
        WHERE id = $4 AND tenant_id = $5
        RETURNING
          id,
          status,
          resolved_at AS "resolvedAt",
          resolved_by AS "resolvedBy"
      `,
        [userId, comment || '', rootCause || '', id, tenantId]
      );

      console.log(`Alarm ${id} resolved by user ${userId}`);

      res.json({
        success: true,
        alarm: result.rows[0],
        message: 'Alarm resolved successfully',
      });
    } catch (error: any) {
      console.error('Error resolving alarm:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to resolve alarm',
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/v1/alarms/:id/comment
 * Add comment to alarm
 */
router.post(
  '/:id/comment',
  [
    param('id').isUUID(),
    body('comment').notEmpty().isString(),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { comment } = req.body;
      const tenantId = req.headers['x-tenant-id'] || 'default-tenant';
      const userId = req.headers['x-user-id'];

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User authentication required',
        });
      }

      // Check if alarm exists
      const alarmCheck = await db.query(
        'SELECT id FROM alarms WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );

      if (alarmCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Alarm not found',
        });
      }

      // Add comment to metadata
      const commentData = {
        userId,
        comment,
        timestamp: new Date().toISOString(),
      };

      await db.query(
        `
        UPDATE alarms
        SET metadata = jsonb_set(
          COALESCE(metadata, '{}'::jsonb),
          '{comments}',
          COALESCE(metadata->'comments', '[]'::jsonb) || $1::jsonb
        )
        WHERE id = $2 AND tenant_id = $3
      `,
        [JSON.stringify(commentData), id, tenantId]
      );

      res.json({
        success: true,
        message: 'Comment added successfully',
      });
    } catch (error: any) {
      console.error('Error adding comment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add comment',
        message: error.message,
      });
    }
  }
);

// ==========================================
// Statistics Routes
// ==========================================

/**
 * GET /api/v1/alarms/stats
 * Get alarm statistics
 */
router.get(
  '/stats',
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || 'default-tenant';
      const { startDate, endDate } = req.query;

      // Date range (default: last 30 days)
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const end = endDate || new Date().toISOString();

      // Get statistics
      const [overallResult, severityBreakdownResult, statusBreakdownResult, topAssetsResult] = await Promise.all([
        // Overall stats
        db.query(
          `
          SELECT
            COUNT(*) AS total,
            COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) AS active,
            COUNT(CASE WHEN status = 'ACKNOWLEDGED' THEN 1 END) AS acknowledged,
            COUNT(CASE WHEN status = 'RESOLVED' THEN 1 END) AS resolved,
            ROUND(AVG(EXTRACT(EPOCH FROM (acknowledged_at - first_occurrence)) / 60)) AS avg_acknowledgment_time_minutes,
            ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - first_occurrence)) / 60)) AS avg_resolution_time_minutes
          FROM alarms
          WHERE tenant_id = $1
            AND first_occurrence >= $2
            AND first_occurrence <= $3
        `,
          [tenantId, start, end]
        ),

        // Severity breakdown
        db.query(
          `
          SELECT
            severity,
            COUNT(*) AS count,
            COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) AS active
          FROM alarms
          WHERE tenant_id = $1
            AND first_occurrence >= $2
            AND first_occurrence <= $3
          GROUP BY severity
          ORDER BY
            CASE severity
              WHEN 'CRITICAL' THEN 1
              WHEN 'WARNING' THEN 2
              WHEN 'INFO' THEN 3
            END
        `,
          [tenantId, start, end]
        ),

        // Status breakdown
        db.query(
          `
          SELECT
            status,
            COUNT(*) AS count
          FROM alarms
          WHERE tenant_id = $1
            AND first_occurrence >= $2
            AND first_occurrence <= $3
          GROUP BY status
        `,
          [tenantId, start, end]
        ),

        // Top assets with most alarms
        db.query(
          `
          SELECT
            a.asset_id AS "assetId",
            ast.name AS "assetName",
            COUNT(*) AS "alarmCount",
            COUNT(CASE WHEN a.severity = 'CRITICAL' THEN 1 END) AS "criticalCount"
          FROM alarms a
          LEFT JOIN assets ast ON a.asset_id = ast.id
          WHERE a.tenant_id = $1
            AND a.first_occurrence >= $2
            AND a.first_occurrence <= $3
            AND a.asset_id IS NOT NULL
          GROUP BY a.asset_id, ast.name
          ORDER BY "alarmCount" DESC
          LIMIT 10
        `,
          [tenantId, start, end]
        ),
      ]);

      res.json({
        success: true,
        period: { start, end },
        overall: overallResult.rows[0],
        severityBreakdown: severityBreakdownResult.rows,
        statusBreakdown: statusBreakdownResult.rows,
        topAssets: topAssetsResult.rows,
      });
    } catch (error: any) {
      console.error('Error getting alarm stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get alarm statistics',
        message: error.message,
      });
    }
  }
);

export default router;
