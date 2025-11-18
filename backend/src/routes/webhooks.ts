/**
 * Webhook Management API (DCMMS-071)
 *
 * Endpoints:
 * - POST /api/v1/webhooks - Register new webhook
 * - GET /api/v1/webhooks - List webhooks
 * - GET /api/v1/webhooks/:id - Get webhook details
 * - PUT /api/v1/webhooks/:id - Update webhook
 * - DELETE /api/v1/webhooks/:id - Delete webhook
 * - GET /api/v1/webhooks/:id/deliveries - Get delivery logs
 * - POST /api/v1/webhooks/:id/test - Test webhook
 * - GET /api/v1/webhooks/:id/stats - Get webhook statistics
 */

import express, { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { db } from '../db';
import WebhookService from '../services/webhook.service';

const router = express.Router();
const webhookService = new WebhookService();

// ==========================================
// Validation Middleware
// ==========================================

const validateWebhook = [
  body('name').notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('description').optional().isString(),
  body('url').notEmpty().isURL({ protocols: ['http', 'https'] }).withMessage('Valid URL required'),
  body('authType').optional().isIn(['none', 'bearer', 'basic', 'hmac']),
  body('authToken').optional().isString(),
  body('customHeaders').optional().isObject(),
  body('eventTypes').isArray().withMessage('Event types must be an array'),
  body('eventTypes.*').isString(),
  body('timeoutSeconds').optional().isInt({ min: 1, max: 60 }),
  body('maxRetries').optional().isInt({ min: 0, max: 5 }),
];

const handleValidationErrors = (req: Request, res: Response, next: Function) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// ==========================================
// Routes
// ==========================================

/**
 * POST /api/v1/webhooks
 * Register new webhook
 */
router.post(
  '/',
  validateWebhook,
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const {
        name,
        description,
        url,
        authType = 'none',
        authToken,
        customHeaders,
        eventTypes,
        timeoutSeconds = 10,
        maxRetries = 3,
      } = req.body;

      // Get tenant from authenticated user (placeholder for now)
      const tenantId = req.headers['x-tenant-id'] || 'default-tenant';
      const userId = req.headers['x-user-id'] || null;

      // Generate secret key for HMAC
      const secretKeyResult = await db.query('SELECT generate_webhook_secret() AS secret');
      const secretKey = secretKeyResult.rows[0].secret;

      // Insert webhook
      const result = await db.query(
        `
        INSERT INTO webhooks (
          tenant_id,
          name,
          description,
          url,
          auth_type,
          auth_token,
          custom_headers,
          event_types,
          secret_key,
          timeout_seconds,
          max_retries,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING
          id,
          name,
          url,
          auth_type AS "authType",
          event_types AS "eventTypes",
          secret_key AS "secretKey",
          active,
          created_at AS "createdAt"
      `,
        [
          tenantId,
          name,
          description,
          url,
          authType,
          authToken,
          JSON.stringify(customHeaders || {}),
          eventTypes,
          secretKey,
          timeoutSeconds,
          maxRetries,
          userId,
        ]
      );

      const webhook = result.rows[0];

      res.status(201).json({
        success: true,
        webhook,
        message: 'Webhook created successfully',
      });
    } catch (error: any) {
      console.error('Error creating webhook:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create webhook',
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/v1/webhooks
 * List webhooks
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] || 'default-tenant';
    const { active, eventType } = req.query;

    let query = `
      SELECT
        w.id,
        w.name,
        w.description,
        w.url,
        w.auth_type AS "authType",
        w.event_types AS "eventTypes",
        w.active,
        w.created_at AS "createdAt",
        w.updated_at AS "updatedAt",
        w.last_triggered_at AS "lastTriggeredAt",
        ws.total_deliveries AS "totalDeliveries",
        ws.successful_deliveries AS "successfulDeliveries",
        ws.failed_deliveries AS "failedDeliveries",
        ws.success_rate_percent AS "successRate"
      FROM webhooks w
      LEFT JOIN webhook_stats ws ON w.id = ws.webhook_id
      WHERE w.tenant_id = $1
    `;

    const params: any[] = [tenantId];
    let paramCount = 2;

    if (active !== undefined) {
      query += ` AND w.active = $${paramCount++}`;
      params.push(active === 'true');
    }

    if (eventType) {
      query += ` AND $${paramCount++} = ANY(w.event_types)`;
      params.push(eventType);
    }

    query += ' ORDER BY w.created_at DESC';

    const result = await db.query(query, params);

    res.json({
      success: true,
      webhooks: result.rows,
      count: result.rows.length,
    });
  } catch (error: any) {
    console.error('Error listing webhooks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list webhooks',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/webhooks/:id
 * Get webhook details
 */
router.get('/:id', param('id').isUUID(), handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.headers['x-tenant-id'] || 'default-tenant';

    const result = await db.query(
      `
      SELECT
        w.id,
        w.name,
        w.description,
        w.url,
        w.auth_type AS "authType",
        w.custom_headers AS "customHeaders",
        w.event_types AS "eventTypes",
        w.secret_key AS "secretKey",
        w.timeout_seconds AS "timeoutSeconds",
        w.max_retries AS "maxRetries",
        w.active,
        w.created_at AS "createdAt",
        w.updated_at AS "updatedAt",
        w.last_triggered_at AS "lastTriggeredAt",
        ws.total_deliveries AS "totalDeliveries",
        ws.successful_deliveries AS "successfulDeliveries",
        ws.failed_deliveries AS "failedDeliveries",
        ws.success_rate_percent AS "successRate",
        ws.avg_response_time_ms AS "avgResponseTime"
      FROM webhooks w
      LEFT JOIN webhook_stats ws ON w.id = ws.webhook_id
      WHERE w.id = $1 AND w.tenant_id = $2
    `,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Webhook not found',
      });
    }

    res.json({
      success: true,
      webhook: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error getting webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get webhook',
      message: error.message,
    });
  }
});

/**
 * PUT /api/v1/webhooks/:id
 * Update webhook
 */
router.put(
  '/:id',
  param('id').isUUID(),
  validateWebhook,
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const tenantId = req.headers['x-tenant-id'] || 'default-tenant';
      const {
        name,
        description,
        url,
        authType,
        authToken,
        customHeaders,
        eventTypes,
        timeoutSeconds,
        maxRetries,
        active,
      } = req.body;

      const result = await db.query(
        `
        UPDATE webhooks
        SET
          name = COALESCE($1, name),
          description = COALESCE($2, description),
          url = COALESCE($3, url),
          auth_type = COALESCE($4, auth_type),
          auth_token = COALESCE($5, auth_token),
          custom_headers = COALESCE($6, custom_headers),
          event_types = COALESCE($7, event_types),
          timeout_seconds = COALESCE($8, timeout_seconds),
          max_retries = COALESCE($9, max_retries),
          active = COALESCE($10, active),
          updated_at = NOW()
        WHERE id = $11 AND tenant_id = $12
        RETURNING
          id,
          name,
          url,
          auth_type AS "authType",
          event_types AS "eventTypes",
          active,
          updated_at AS "updatedAt"
      `,
        [
          name,
          description,
          url,
          authType,
          authToken,
          customHeaders ? JSON.stringify(customHeaders) : null,
          eventTypes,
          timeoutSeconds,
          maxRetries,
          active,
          id,
          tenantId,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Webhook not found',
        });
      }

      res.json({
        success: true,
        webhook: result.rows[0],
        message: 'Webhook updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating webhook:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update webhook',
        message: error.message,
      });
    }
  }
);

/**
 * DELETE /api/v1/webhooks/:id
 * Delete webhook
 */
router.delete('/:id', param('id').isUUID(), handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.headers['x-tenant-id'] || 'default-tenant';

    const result = await db.query(
      'DELETE FROM webhooks WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Webhook not found',
      });
    }

    res.json({
      success: true,
      message: 'Webhook deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete webhook',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/webhooks/:id/deliveries
 * Get webhook delivery logs
 */
router.get(
  '/:id/deliveries',
  param('id').isUUID(),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const tenantId = req.headers['x-tenant-id'] || 'default-tenant';

      // Verify webhook belongs to tenant
      const webhookCheck = await db.query(
        'SELECT id FROM webhooks WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );

      if (webhookCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Webhook not found',
        });
      }

      // Get deliveries
      const result = await db.query(
        `
        SELECT
          id,
          event_type AS "eventType",
          request_url AS "requestUrl",
          response_status AS "responseStatus",
          response_time_ms AS "responseTimeMs",
          status,
          attempt_number AS "attemptNumber",
          max_attempts AS "maxAttempts",
          error_message AS "errorMessage",
          sent_at AS "sentAt",
          completed_at AS "completedAt"
        FROM webhook_deliveries
        WHERE webhook_id = $1
        ORDER BY sent_at DESC
        LIMIT $2 OFFSET $3
      `,
        [id, limit, offset]
      );

      // Get total count
      const countResult = await db.query(
        'SELECT COUNT(*) FROM webhook_deliveries WHERE webhook_id = $1',
        [id]
      );

      res.json({
        success: true,
        deliveries: result.rows,
        total: parseInt(countResult.rows[0].count),
        limit,
        offset,
      });
    } catch (error: any) {
      console.error('Error getting webhook deliveries:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get webhook deliveries',
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/v1/webhooks/:id/test
 * Test webhook with sample payload
 */
router.post('/:id/test', param('id').isUUID(), handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.headers['x-tenant-id'] || 'default-tenant';

    // Get webhook
    const webhookResult = await db.query(
      `
      SELECT
        id,
        url,
        auth_type AS "authType",
        auth_token AS "authToken",
        custom_headers AS "customHeaders",
        secret_key AS "secretKey",
        timeout_seconds AS "timeoutSeconds",
        max_retries AS "maxRetries"
      FROM webhooks
      WHERE id = $1 AND tenant_id = $2
    `,
      [id, tenantId]
    );

    if (webhookResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Webhook not found',
      });
    }

    const webhook = webhookResult.rows[0];

    // Send test payload
    const testPayload = {
      event: 'webhook.test',
      eventType: 'webhook_test',
      timestamp: new Date().toISOString(),
      tenantId,
      data: {
        message: 'This is a test webhook from dCMMS',
        webhookId: id,
      },
      metadata: {
        source: 'dCMMS',
        version: '1.0',
        test: true,
      },
    };

    const result = await webhookService.sendWebhook(webhook, testPayload);

    res.json({
      success: result.success,
      delivery: {
        deliveryId: result.deliveryId,
        status: result.status,
        responseTime: result.responseTime,
        error: result.error,
      },
      message: result.success ? 'Test webhook sent successfully' : 'Test webhook failed',
    });
  } catch (error: any) {
    console.error('Error testing webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test webhook',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/webhooks/:id/stats
 * Get webhook statistics
 */
router.get('/:id/stats', param('id').isUUID(), handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.headers['x-tenant-id'] || 'default-tenant';

    // Verify webhook belongs to tenant
    const webhookCheck = await db.query(
      'SELECT id FROM webhooks WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (webhookCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Webhook not found',
      });
    }

    // Get statistics
    const result = await db.query(
      `
      SELECT
        webhook_name AS name,
        url,
        active,
        total_deliveries AS "totalDeliveries",
        successful_deliveries AS "successfulDeliveries",
        failed_deliveries AS "failedDeliveries",
        retrying_deliveries AS "retryingDeliveries",
        avg_response_time_ms AS "avgResponseTime",
        last_delivery_at AS "lastDeliveryAt",
        success_rate_percent AS "successRate"
      FROM webhook_stats
      WHERE webhook_id = $1
    `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        stats: {
          totalDeliveries: 0,
          successfulDeliveries: 0,
          failedDeliveries: 0,
          retryingDeliveries: 0,
          successRate: 0,
        },
      });
    }

    res.json({
      success: true,
      stats: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error getting webhook stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get webhook statistics',
      message: error.message,
    });
  }
});

export default router;
