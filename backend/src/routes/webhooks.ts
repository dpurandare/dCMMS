import crypto from "crypto";
import { FastifyPluginAsync } from "fastify";
import { pool } from "../db";
import WebhookService from "../services/webhook.service";
import { authorize } from "../middleware/authorize";

// Delivery stats, computed from webhook_deliveries — there is no
// webhook_stats table (REV-025b). No per-delivery timing is captured
// anywhere in the schema, so avgResponseTime is honestly NULL rather than
// fabricated.
const DELIVERY_STATS_SUBQUERY = `
  SELECT
    webhook_id,
    COUNT(*) AS total_deliveries,
    COUNT(*) FILTER (WHERE status = 'success') AS successful_deliveries,
    COUNT(*) FILTER (WHERE status != 'success') AS failed_deliveries,
    ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'success') / NULLIF(COUNT(*), 0), 2) AS success_rate_percent,
    MAX(sent_at) AS last_delivery_at
  FROM webhook_deliveries
  GROUP BY webhook_id
`;

interface WebhookMetadata {
  description?: string;
  timeoutSeconds?: number;
  maxRetries?: number;
}

function parseMetadata(raw: string | null): WebhookMetadata {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const webhookRoutes: FastifyPluginAsync = async (server) => {
  // Import CSRF protection
  const { csrfProtection } = await import("../middleware/csrf");

  // Require authentication and RBAC for all routes
  server.addHook("onRequest", server.authenticate);
  server.addHook("onRequest", authorize({ permissions: ["manage:webhooks"] }));

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
              enum: ["none", "bearer", "basic", "api_key"],
              default: "none",
            },
            authToken: { type: "string" },
            authUsername: { type: "string" },
            authPassword: { type: "string" },
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
      preHandler: [server.authenticate, csrfProtection],
    },
    async (request, reply) => {
      try {
        const {
          name,
          description,
          url,
          authType = "none",
          authToken,
          authUsername,
          authPassword,
          customHeaders,
          eventTypes,
          timeoutSeconds = 10,
          maxRetries = 3,
        } = request.body as any;

        const user = request.user;
        const tenantId = user.tenantId;

        const secret = crypto.randomBytes(32).toString("hex");
        const externalWebhookId = `wh_${crypto.randomBytes(12).toString("hex")}`;
        const metadata: WebhookMetadata = {
          description,
          timeoutSeconds,
          maxRetries,
        };

        const result = await pool.query(
          `
          INSERT INTO webhooks (
            tenant_id, webhook_id, name, url, auth_type, auth_token,
            auth_username, auth_password, headers, events, secret,
            is_active, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, $12)
          RETURNING
            id, name, url, auth_type AS "authType", events,
            is_active AS "active", created_at AS "createdAt"
        `,
          [
            tenantId,
            externalWebhookId,
            name,
            url,
            authType,
            authToken || null,
            authUsername || null,
            authPassword || null,
            JSON.stringify(customHeaders || {}),
            JSON.stringify(eventTypes || []),
            secret,
            JSON.stringify(metadata),
          ],
        );

        const webhook = result.rows[0];
        webhook.eventTypes = JSON.parse(webhook.events);
        delete webhook.events;

        return reply.status(201).send({
          success: true,
          webhook: { ...webhook, secretKey: secret },
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
      preHandler: [server.authenticate, csrfProtection],
    },
    async (request, reply) => {
      try {
        const user = request.user;
        const tenantId = user.tenantId;
        const { active, eventType } = request.query as any;

        let query = `
          SELECT
            w.id, w.name, w.url, w.auth_type AS "authType", w.events,
            w.is_active AS "active", w.metadata,
            w.created_at AS "createdAt", w.updated_at AS "updatedAt",
            COALESCE(ws.total_deliveries, 0) AS "totalDeliveries",
            COALESCE(ws.successful_deliveries, 0) AS "successfulDeliveries",
            COALESCE(ws.failed_deliveries, 0) AS "failedDeliveries",
            ws.success_rate_percent AS "successRate",
            ws.last_delivery_at AS "lastTriggeredAt"
          FROM webhooks w
          LEFT JOIN (${DELIVERY_STATS_SUBQUERY}) ws ON w.id = ws.webhook_id
          WHERE w.tenant_id = $1
        `;

        const params: any[] = [tenantId];
        let paramCount = 2;

        if (active !== undefined) {
          query += ` AND w.is_active = $${paramCount++}`;
          params.push(active === "true" || active === true);
        }

        query += " ORDER BY w.created_at DESC";

        const result = await pool.query(query, params);

        let webhooks = result.rows.map((row) => {
          const meta = parseMetadata(row.metadata);
          let eventTypes: string[] = [];
          try {
            eventTypes = JSON.parse(row.events || "[]");
          } catch {
            eventTypes = [];
          }
          delete row.events;
          delete row.metadata;
          return { ...row, eventTypes, description: meta.description };
        });

        if (eventType) {
          webhooks = webhooks.filter(
            (w) =>
              w.eventTypes.includes(eventType) || w.eventTypes.includes("all"),
          );
        }

        return {
          success: true,
          webhooks,
          count: webhooks.length,
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
      preHandler: [server.authenticate, csrfProtection],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as any;
        const user = request.user;
        const tenantId = user.tenantId;

        const result = await pool.query(
          `
          SELECT
            w.id, w.name, w.url, w.auth_type AS "authType",
            w.auth_username AS "authUsername", w.headers AS "customHeaders",
            w.events, w.is_active AS "active", w.metadata,
            w.created_at AS "createdAt", w.updated_at AS "updatedAt",
            COALESCE(ws.total_deliveries, 0) AS "totalDeliveries",
            COALESCE(ws.successful_deliveries, 0) AS "successfulDeliveries",
            COALESCE(ws.failed_deliveries, 0) AS "failedDeliveries",
            ws.success_rate_percent AS "successRate",
            NULL::integer AS "avgResponseTime",
            ws.last_delivery_at AS "lastTriggeredAt"
          FROM webhooks w
          LEFT JOIN (${DELIVERY_STATS_SUBQUERY}) ws ON w.id = ws.webhook_id
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

        const row = result.rows[0];
        const meta = parseMetadata(row.metadata);
        let eventTypes: string[] = [];
        try {
          eventTypes = JSON.parse(row.events || "[]");
        } catch {
          eventTypes = [];
        }
        delete row.events;
        delete row.metadata;

        return {
          success: true,
          webhook: {
            ...row,
            eventTypes,
            description: meta.description,
            timeoutSeconds: meta.timeoutSeconds,
            maxRetries: meta.maxRetries,
          },
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
            authUsername: { type: "string" },
            authPassword: { type: "string" },
            customHeaders: { type: "object" },
            eventTypes: { type: "array", items: { type: "string" } },
            timeoutSeconds: { type: "integer" },
            maxRetries: { type: "integer" },
            active: { type: "boolean" },
          },
        },
      },
      preHandler: [server.authenticate, csrfProtection],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as any;
        const user = request.user;
        const tenantId = user.tenantId;
        const body = request.body as any;

        // Metadata (description/timeoutSeconds/maxRetries) is merged, not
        // replaced wholesale, so a partial update doesn't clobber the rest.
        const existing = await pool.query(
          "SELECT metadata FROM webhooks WHERE id = $1 AND tenant_id = $2",
          [id, tenantId],
        );
        if (existing.rows.length === 0) {
          return reply.status(404).send({
            success: false,
            error: "Webhook not found",
          });
        }
        const mergedMetadata: WebhookMetadata = {
          ...parseMetadata(existing.rows[0].metadata),
          ...(body.description !== undefined && {
            description: body.description,
          }),
          ...(body.timeoutSeconds !== undefined && {
            timeoutSeconds: body.timeoutSeconds,
          }),
          ...(body.maxRetries !== undefined && { maxRetries: body.maxRetries }),
        };

        const result = await pool.query(
          `
          UPDATE webhooks
          SET
            name = COALESCE($1, name),
            url = COALESCE($2, url),
            auth_type = COALESCE($3, auth_type),
            auth_token = COALESCE($4, auth_token),
            auth_username = COALESCE($5, auth_username),
            auth_password = COALESCE($6, auth_password),
            headers = COALESCE($7, headers),
            events = COALESCE($8, events),
            is_active = COALESCE($9, is_active),
            metadata = $10,
            updated_at = NOW()
          WHERE id = $11 AND tenant_id = $12
          RETURNING
            id, name, url, auth_type AS "authType", events,
            is_active AS "active", updated_at AS "updatedAt"
        `,
          [
            body.name,
            body.url,
            body.authType,
            body.authToken,
            body.authUsername,
            body.authPassword,
            body.customHeaders ? JSON.stringify(body.customHeaders) : null,
            body.eventTypes ? JSON.stringify(body.eventTypes) : null,
            body.active,
            JSON.stringify(mergedMetadata),
            id,
            tenantId,
          ],
        );

        const webhook = result.rows[0];
        webhook.eventTypes = JSON.parse(webhook.events);
        delete webhook.events;

        return {
          success: true,
          webhook,
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
      preHandler: [server.authenticate, csrfProtection],
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
      preHandler: [server.authenticate, csrfProtection],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as any;
        const { limit = 50, offset = 0 } = request.query as any;
        const user = request.user;
        const tenantId = user.tenantId;

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

        const result = await pool.query(
          `
          SELECT
            id, event_type AS "eventType", status,
            status_code AS "statusCode", response_body AS "responseBody",
            error_message AS "errorMessage", attempt_count AS "attemptCount",
            sent_at AS "sentAt", created_at AS "createdAt"
          FROM webhook_deliveries
          WHERE webhook_id = $1
          ORDER BY created_at DESC
          LIMIT $2 OFFSET $3
        `,
          [id, limit, offset],
        );

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
      preHandler: [server.authenticate, csrfProtection],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as any;
        const user = request.user;
        const tenantId = user.tenantId;

        const webhookResult = await pool.query(
          `
          SELECT
            id, url, auth_type AS "authType", auth_token AS "authToken",
            auth_username AS "authUsername", auth_password AS "authPassword",
            headers, secret, metadata
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

        const row = webhookResult.rows[0];
        const meta = parseMetadata(row.metadata);
        const webhook = {
          id: row.id,
          url: row.url,
          authType: row.authType,
          authToken: row.authToken,
          authUsername: row.authUsername,
          authPassword: row.authPassword,
          headers: row.headers ? JSON.parse(row.headers) : undefined,
          secret: row.secret,
          timeoutSeconds: meta.timeoutSeconds ?? 10,
          maxRetries: meta.maxRetries ?? 3,
        };

        // "webhook.test" isn't one of notification_event_type's ten real
        // values, so the delivery service logs this attempt best-effort
        // (recordDelivery swallows the enum violation rather than failing
        // the test call) — see webhook.service.ts.
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
      preHandler: [server.authenticate, csrfProtection],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as any;
        const user = request.user;
        const tenantId = user.tenantId;

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

        // "retrying" isn't a real delivery status (no in-flight state is
        // persisted — see webhook.service.ts), so retryingDeliveries counts
        // deliveries that needed more than one attempt instead.
        const result = await pool.query(
          `
          SELECT
            w.name, w.url, w.is_active AS "active",
            COALESCE(COUNT(d.id), 0) AS "totalDeliveries",
            COALESCE(COUNT(d.id) FILTER (WHERE d.status = 'success'), 0) AS "successfulDeliveries",
            COALESCE(COUNT(d.id) FILTER (WHERE d.status != 'success'), 0) AS "failedDeliveries",
            COALESCE(COUNT(d.id) FILTER (WHERE d.attempt_count > 1), 0) AS "retryingDeliveries",
            NULL::integer AS "avgResponseTime",
            MAX(d.sent_at) AS "lastDeliveryAt",
            ROUND(100.0 * COUNT(d.id) FILTER (WHERE d.status = 'success') / NULLIF(COUNT(d.id), 0), 2) AS "successRate"
          FROM webhooks w
          LEFT JOIN webhook_deliveries d ON d.webhook_id = w.id
          WHERE w.id = $1
          GROUP BY w.id, w.name, w.url, w.is_active
        `,
          [id],
        );

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
