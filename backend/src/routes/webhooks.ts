import { FastifyPluginAsync } from "fastify";
import { db, pool } from "../db";
import WebhookService from "../services/webhook.service";

const webhookRoutes: FastifyPluginAsync = async (server) => {
  const webhookService = new WebhookService();

  // POST /api/v1/webhooks
  server.post(
    "/",
    {
      schema: {
        summary: "Register new webhook",
        tags: ["Webhooks"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["name", "url", "eventTypes"],
          properties: {
            name: { type: "string", maxLength: 100 },
            description: { type: "string" },
            url: { type: "string", format: "uri" },
            authType: {
              type: "string",
              enum: ["none", "bearer", "basic", "hmac"],
              default: "none",
            },
            authToken: { type: "string" },
            customHeaders: { type: "object" },
            eventTypes: { type: "array", items: { type: "string" } },
            timeoutSeconds: {
              type: "integer",
              minimum: 1,
              maximum: 60,
              default: 10,
            },
            maxRetries: { type: "integer", minimum: 0, maximum: 5, default: 3 },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const {
          name,
          description,
          url,
          authType = "none",
          authToken,
          customHeaders,
          eventTypes,
          timeoutSeconds = 10,
          maxRetries = 3,
        } = request.body as any;

        const user = request.user;
        const tenantId = user.tenantId;
        const userId = user.id;

        // Generate secret key for HMAC
        const secretKeyResult = await pool.query(
          "SELECT generate_webhook_secret() AS secret",
        );
        const secretKey = secretKeyResult.rows[0].secret;

        // Insert webhook
        const result = await pool.query(
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
          ],
        );

        const webhook = result.rows[0];

        return reply.status(201).send({
          success: true,
          webhook,
          message: "Webhook created successfully",
        });
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: "Failed to create webhook",
          message: error.message,
        });
      }
    },
  );

  // GET /api/v1/webhooks
  server.get(
    "/",
    {
      schema: {
        summary: "List webhooks",
        tags: ["Webhooks"],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          properties: {
            active: { type: "boolean" },
            eventType: { type: "string" },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const user = request.user;
        const tenantId = user.tenantId;
        const { active, eventType } = request.query as any;

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
          params.push(active === "true" || active === true);
        }

        if (eventType) {
          query += ` AND $${paramCount++} = ANY(w.event_types)`;
          params.push(eventType);
        }

        query += " ORDER BY w.created_at DESC";

        const result = await pool.query(query, params);

        return {
          success: true,
          webhooks: result.rows,
          count: result.rows.length,
        };
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: "Failed to list webhooks",
          message: error.message,
        });
      }
    },
  );

  // GET /api/v1/webhooks/:id
  server.get(
    "/:id",
    {
      schema: {
        summary: "Get webhook details",
        tags: ["Webhooks"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const { id } = request.params as any;
        const user = request.user;
        const tenantId = user.tenantId;

        const result = await pool.query(
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
          [id, tenantId],
        );

        if (result.rows.length === 0) {
          return reply.status(404).send({
            success: false,
            error: "Webhook not found",
          });
        }

        return {
          success: true,
          webhook: result.rows[0],
        };
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: "Failed to get webhook",
          message: error.message,
        });
      }
    },
  );

  // PUT /api/v1/webhooks/:id
  server.put(
    "/:id",
    {
      schema: {
        summary: "Update webhook",
        tags: ["Webhooks"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
        body: {
          type: "object",
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            url: { type: "string" },
            authType: { type: "string" },
            authToken: { type: "string" },
            customHeaders: { type: "object" },
            eventTypes: { type: "array", items: { type: "string" } },
            timeoutSeconds: { type: "integer" },
            maxRetries: { type: "integer" },
            active: { type: "boolean" },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const { id } = request.params as any;
        const user = request.user;
        const tenantId = user.tenantId;
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
        } = request.body as any;

        const result = await pool.query(
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
          ],
        );

        if (result.rows.length === 0) {
          return reply.status(404).send({
            success: false,
            error: "Webhook not found",
          });
        }

        return {
          success: true,
          webhook: result.rows[0],
          message: "Webhook updated successfully",
        };
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: "Failed to update webhook",
          message: error.message,
        });
      }
    },
  );

  // DELETE /api/v1/webhooks/:id
  server.delete(
    "/:id",
    {
      schema: {
        summary: "Delete webhook",
        tags: ["Webhooks"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const { id } = request.params as any;
        const user = request.user;
        const tenantId = user.tenantId;

        const result = await pool.query(
          "DELETE FROM webhooks WHERE id = $1 AND tenant_id = $2 RETURNING id",
          [id, tenantId],
        );

        if (result.rows.length === 0) {
          return reply.status(404).send({
            success: false,
            error: "Webhook not found",
          });
        }

        return {
          success: true,
          message: "Webhook deleted successfully",
        };
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: "Failed to delete webhook",
          message: error.message,
        });
      }
    },
  );

  // GET /api/v1/webhooks/:id/deliveries
  server.get(
    "/:id/deliveries",
    {
      schema: {
        summary: "Get webhook delivery logs",
        tags: ["Webhooks"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
        querystring: {
          type: "object",
          properties: {
            limit: { type: "integer", default: 50 },
            offset: { type: "integer", default: 0 },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const { id } = request.params as any;
        const { limit = 50, offset = 0 } = request.query as any;
        const user = request.user;
        const tenantId = user.tenantId;

        // Verify webhook belongs to tenant
        const webhookCheck = await pool.query(
          "SELECT id FROM webhooks WHERE id = $1 AND tenant_id = $2",
          [id, tenantId],
        );

        if (webhookCheck.rows.length === 0) {
          return reply.status(404).send({
            success: false,
            error: "Webhook not found",
          });
        }

        // Get deliveries
        const result = await pool.query(
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
          [id, limit, offset],
        );

        // Get total count
        const countResult = await pool.query(
          "SELECT COUNT(*) FROM webhook_deliveries WHERE webhook_id = $1",
          [id],
        );

        return {
          success: true,
          deliveries: result.rows,
          total: parseInt(countResult.rows[0].count),
          limit,
          offset,
        };
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: "Failed to get webhook deliveries",
          message: error.message,
        });
      }
    },
  );

  // POST /api/v1/webhooks/:id/test
  server.post(
    "/:id/test",
    {
      schema: {
        summary: "Test webhook with sample payload",
        tags: ["Webhooks"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const { id } = request.params as any;
        const user = request.user;
        const tenantId = user.tenantId;

        // Get webhook
        const webhookResult = await pool.query(
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
          [id, tenantId],
        );

        if (webhookResult.rows.length === 0) {
          return reply.status(404).send({
            success: false,
            error: "Webhook not found",
          });
        }

        const webhook = webhookResult.rows[0];

        // Send test payload
        const testPayload = {
          event: "webhook.test",
          eventType: "webhook_test",
          timestamp: new Date().toISOString(),
          tenantId,
          data: {
            message: "This is a test webhook from dCMMS",
            webhookId: id,
          },
          metadata: {
            source: "dCMMS",
            version: "1.0",
            test: true,
          },
        };

        const result = await webhookService.sendWebhook(webhook, testPayload);

        return {
          success: result.success,
          delivery: {
            deliveryId: result.deliveryId,
            status: result.status,
            responseTime: result.responseTime,
            error: result.error,
          },
          message: result.success
            ? "Test webhook sent successfully"
            : "Test webhook failed",
        };
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: "Failed to test webhook",
          message: error.message,
        });
      }
    },
  );

  // GET /api/v1/webhooks/:id/stats
  server.get(
    "/:id/stats",
    {
      schema: {
        summary: "Get webhook statistics",
        tags: ["Webhooks"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const { id } = request.params as any;
        const user = request.user;
        const tenantId = user.tenantId;

        // Verify webhook belongs to tenant
        const webhookCheck = await pool.query(
          "SELECT id FROM webhooks WHERE id = $1 AND tenant_id = $2",
          [id, tenantId],
        );

        if (webhookCheck.rows.length === 0) {
          return reply.status(404).send({
            success: false,
            error: "Webhook not found",
          });
        }

        // Get statistics
        const result = await pool.query(
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
          [id],
        );

        if (result.rows.length === 0) {
          return {
            success: true,
            stats: {
              totalDeliveries: 0,
              successfulDeliveries: 0,
              failedDeliveries: 0,
              retryingDeliveries: 0,
              successRate: 0,
            },
          };
        }

        return {
          success: true,
          stats: result.rows[0],
        };
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: "Failed to get webhook statistics",
          message: error.message,
        });
      }
    },
  );
};

export default webhookRoutes;
