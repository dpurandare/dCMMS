import { FastifyPluginAsync } from "fastify";
import { pool } from "../db";

const notificationHistoryRoutes: FastifyPluginAsync = async (server) => {
  // GET /api/v1/notifications/history
  server.get(
    "/history",
    {
      schema: {
        summary: "Query notification history with filters",
        tags: ["Notifications"],
        querystring: {
          type: "object",
          properties: {
            userId: { type: "string", format: "uuid" },
            channel: {
              type: "string",
              enum: ["email", "sms", "push", "slack", "webhook"],
            },
            status: {
              type: "string",
              enum: [
                "sent",
                "delivered",
                "failed",
                "bounced",
                "clicked",
                "opened",
              ],
            },
            priority: {
              type: "string",
              enum: ["critical", "high", "medium", "low"],
            },
            eventType: { type: "string" },
            startDate: { type: "string", format: "date-time" },
            endDate: { type: "string", format: "date-time" },
            limit: { type: "integer", minimum: 1, maximum: 100, default: 50 },
            offset: { type: "integer", minimum: 0, default: 0 },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const tenantId =
          (request.headers["x-tenant-id"] as string) || "default-tenant";
        const {
          userId,
          channel,
          status,
          priority,
          eventType,
          startDate,
          endDate,
          limit = 50,
          offset = 0,
        } = request.query as any;

        // Build query
        let query = `
          SELECT
            nh.id,
            nh.user_id AS "userId",
            nh.channel,
            nh.template_code AS "templateCode",
            nh.subject,
            nh.body_preview AS "bodyPreview",
            nh.status,
            nh.priority,
            nh.sent_at AS "sentAt",
            nh.delivered_at AS "deliveredAt",
            nh.opened_at AS "openedAt",
            nh.clicked_at AS "clickedAt",
            nh.failed_at AS "failedAt",
            nh.failure_reason AS "failureReason",
            nh.metadata,
            u.email AS "userEmail",
            u.first_name AS "userFirstName",
            u.last_name AS "userLastName"
          FROM notification_history nh
          INNER JOIN users u ON nh.user_id = u.id
          WHERE u.tenant_id = $1
        `;

        const params: any[] = [tenantId];
        let paramCount = 2;

        if (userId) {
          query += ` AND nh.user_id = $${paramCount++}`;
          params.push(userId);
        }

        if (channel) {
          query += ` AND nh.channel = $${paramCount++}`;
          params.push(channel);
        }

        if (status) {
          query += ` AND nh.status = $${paramCount++}`;
          params.push(status);
        }

        if (priority) {
          query += ` AND nh.priority = $${paramCount++}`;
          params.push(priority);
        }

        if (eventType) {
          query += ` AND nh.metadata->>'eventType' = $${paramCount++}`;
          params.push(eventType);
        }

        if (startDate) {
          query += ` AND nh.sent_at >= $${paramCount++}`;
          params.push(startDate);
        }

        if (endDate) {
          query += ` AND nh.sent_at <= $${paramCount++}`;
          params.push(endDate);
        }

        query += ` ORDER BY nh.sent_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        // Get total count
        let countQuery = `
          SELECT COUNT(*) FROM notification_history nh
          INNER JOIN users u ON nh.user_id = u.id
          WHERE u.tenant_id = $1
        `;
        const countParams: any[] = [tenantId];
        let countParamIndex = 2;

        if (userId) {
          countQuery += ` AND nh.user_id = $${countParamIndex++}`;
          countParams.push(userId);
        }
        if (channel) {
          countQuery += ` AND nh.channel = $${countParamIndex++}`;
          countParams.push(channel);
        }
        if (status) {
          countQuery += ` AND nh.status = $${countParamIndex++}`;
          countParams.push(status);
        }
        if (priority) {
          countQuery += ` AND nh.priority = $${countParamIndex++}`;
          countParams.push(priority);
        }
        if (eventType) {
          countQuery += ` AND nh.metadata->>'eventType' = $${countParamIndex++}`;
          countParams.push(eventType);
        }
        if (startDate) {
          countQuery += ` AND nh.sent_at >= $${countParamIndex++}`;
          countParams.push(startDate);
        }
        if (endDate) {
          countQuery += ` AND nh.sent_at <= $${countParamIndex++}`;
          countParams.push(endDate);
        }

        const countResult = await pool.query(countQuery, countParams);

        return {
          success: true,
          notifications: result.rows,
          total: parseInt(countResult.rows[0].count),
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        };
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: "Failed to query notification history",
          message: error.message,
        });
      }
    },
  );

  // GET /api/v1/notifications/history/:id
  server.get(
    "/history/:id",
    {
      schema: {
        summary: "Get detailed notification info",
        tags: ["Notifications"],
        params: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantId =
          (request.headers["x-tenant-id"] as string) || "default-tenant";

        const result = await pool.query(
          `
          SELECT
            nh.id,
            nh.user_id AS "userId",
            nh.notification_rule_id AS "ruleId",
            nh.channel,
            nh.template_code AS "templateCode",
            nh.subject,
            nh.body,
            nh.status,
            nh.priority,
            nh.provider_message_id AS "providerMessageId",
            nh.sent_at AS "sentAt",
            nh.delivered_at AS "deliveredAt",
            nh.opened_at AS "openedAt",
            nh.clicked_at AS "clickedAt",
            nh.failed_at AS "failedAt",
            nh.failure_reason AS "failureReason",
            nh.retry_count AS "retryCount",
            nh.cost,
            nh.metadata,
            nh.created_at AS "createdAt",
            u.email AS "userEmail",
            u.first_name AS "userFirstName",
            u.last_name AS "userLastName"
          FROM notification_history nh
          INNER JOIN users u ON nh.user_id = u.id
          WHERE nh.id = $1 AND u.tenant_id = $2
        `,
          [id, tenantId],
        );

        if (result.rows.length === 0) {
          return reply.status(404).send({
            success: false,
            error: "Notification not found",
          });
        }

        return {
          success: true,
          notification: result.rows[0],
        };
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: "Failed to get notification",
          message: error.message,
        });
      }
    },
  );

  // GET /api/v1/notifications/stats
  server.get(
    "/stats",
    {
      schema: {
        summary: "Get notification statistics",
        tags: ["Notifications"],
        querystring: {
          type: "object",
          properties: {
            startDate: { type: "string", format: "date-time" },
            endDate: { type: "string", format: "date-time" },
            groupBy: {
              type: "string",
              enum: ["channel", "status", "priority", "day", "week", "month"],
            },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const tenantId =
          (request.headers["x-tenant-id"] as string) || "default-tenant";
        const {
          startDate,
          endDate,
          groupBy = "channel",
        } = request.query as any;

        // Date range (default: last 30 days)
        const start =
          startDate ||
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const end = endDate || new Date().toISOString();

        // Overall stats
        const overallResult = await pool.query(
          `
          SELECT
            COUNT(*) AS total,
            COUNT(CASE WHEN status = 'sent' OR status = 'delivered' THEN 1 END) AS sent,
            COUNT(CASE WHEN status = 'delivered' THEN 1 END) AS delivered,
            COUNT(CASE WHEN status = 'opened' THEN 1 END) AS opened,
            COUNT(CASE WHEN status = 'clicked' THEN 1 END) AS clicked,
            COUNT(CASE WHEN status = 'failed' OR status = 'bounced' THEN 1 END) AS failed,
            ROUND(AVG(EXTRACT(EPOCH FROM (delivered_at - sent_at)))) AS avg_delivery_time_seconds,
            SUM(cost) AS total_cost
          FROM notification_history nh
          INNER JOIN users u ON nh.user_id = u.id
          WHERE u.tenant_id = $1
            AND nh.sent_at >= $2
            AND nh.sent_at <= $3
        `,
          [tenantId, start, end],
        );

        // Grouped stats
        let groupByColumn = "channel";
        if (groupBy === "status") groupByColumn = "status";
        else if (groupBy === "priority") groupByColumn = "priority";
        else if (groupBy === "day") groupByColumn = "DATE(sent_at)";
        else if (groupBy === "week")
          groupByColumn = "DATE_TRUNC('week', sent_at)";
        else if (groupBy === "month")
          groupByColumn = "DATE_TRUNC('month', sent_at)";

        const groupedResult = await pool.query(
          `
          SELECT
            ${groupByColumn} AS group_key,
            COUNT(*) AS count,
            COUNT(CASE WHEN status = 'delivered' THEN 1 END) AS delivered,
            COUNT(CASE WHEN status = 'failed' OR status = 'bounced' THEN 1 END) AS failed
          FROM notification_history nh
          INNER JOIN users u ON nh.user_id = u.id
          WHERE u.tenant_id = $1
            AND nh.sent_at >= $2
            AND nh.sent_at <= $3
          GROUP BY ${groupByColumn}
          ORDER BY group_key
        `,
          [tenantId, start, end],
        );

        return {
          success: true,
          period: { start, end },
          overall: overallResult.rows[0],
          breakdown: groupedResult.rows,
          groupBy,
        };
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: "Failed to get notification statistics",
          message: error.message,
        });
      }
    },
  );

  // GET /api/v1/notifications/analytics
  server.get(
    "/analytics",
    {
      schema: {
        summary: "Get analytics dashboard data",
        tags: ["Notifications"],
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const tenantId =
          (request.headers["x-tenant-id"] as string) || "default-tenant";

        // Get various metrics in parallel
        const [
          last7DaysResult,
          last30DaysResult,
          channelBreakdownResult,
          topTemplatesResult,
          failureReasonsResult,
        ] = await Promise.all([
          // Last 7 days trend
          pool.query(
            `
            SELECT
              DATE(sent_at) AS date,
              COUNT(*) AS total,
              COUNT(CASE WHEN status = 'delivered' THEN 1 END) AS delivered,
              COUNT(CASE WHEN status = 'failed' THEN 1 END) AS failed
            FROM notification_history nh
            INNER JOIN users u ON nh.user_id = u.id
            WHERE u.tenant_id = $1
              AND nh.sent_at >= NOW() - INTERVAL '7 days'
            GROUP BY DATE(sent_at)
            ORDER BY date
          `,
            [tenantId],
          ),

          // Last 30 days summary
          pool.query(
            `
            SELECT
              COUNT(*) AS total,
              COUNT(CASE WHEN status = 'delivered' THEN 1 END) AS delivered,
              COUNT(CASE WHEN status = 'opened' THEN 1 END) AS opened,
              ROUND(100.0 * COUNT(CASE WHEN status = 'delivered' THEN 1 END) / NULLIF(COUNT(*), 0), 2) AS delivery_rate,
              ROUND(100.0 * COUNT(CASE WHEN status = 'opened' THEN 1 END) / NULLIF(COUNT(CASE WHEN status = 'delivered' THEN 1 END), 0), 2) AS open_rate
            FROM notification_history nh
            INNER JOIN users u ON nh.user_id = u.id
            WHERE u.tenant_id = $1
              AND nh.sent_at >= NOW() - INTERVAL '30 days'
          `,
            [tenantId],
          ),

          // Channel breakdown
          pool.query(
            `
            SELECT
              channel,
              COUNT(*) AS count,
              COUNT(CASE WHEN status = 'delivered' THEN 1 END) AS delivered,
              SUM(cost) AS cost
            FROM notification_history nh
            INNER JOIN users u ON nh.user_id = u.id
            WHERE u.tenant_id = $1
              AND nh.sent_at >= NOW() - INTERVAL '30 days'
            GROUP BY channel
            ORDER BY count DESC
          `,
            [tenantId],
          ),

          // Top templates
          pool.query(
            `
            SELECT
              template_code AS template,
              COUNT(*) AS sent,
              COUNT(CASE WHEN status = 'delivered' THEN 1 END) AS delivered,
              ROUND(100.0 * COUNT(CASE WHEN status = 'delivered' THEN 1 END) / NULLIF(COUNT(*), 0), 2) AS delivery_rate
            FROM notification_history nh
            INNER JOIN users u ON nh.user_id = u.id
            WHERE u.tenant_id = $1
              AND nh.sent_at >= NOW() - INTERVAL '30 days'
            GROUP BY template_code
            ORDER BY sent DESC
            LIMIT 10
          `,
            [tenantId],
          ),

          // Common failure reasons
          pool.query(
            `
            SELECT
              failure_reason,
              COUNT(*) AS count
            FROM notification_history nh
            INNER JOIN users u ON nh.user_id = u.id
            WHERE u.tenant_id = $1
              AND nh.sent_at >= NOW() - INTERVAL '30 days'
              AND (status = 'failed' OR status = 'bounced')
              AND failure_reason IS NOT NULL
            GROUP BY failure_reason
            ORDER BY count DESC
            LIMIT 10
          `,
            [tenantId],
          ),
        ]);

        return {
          success: true,
          analytics: {
            last7Days: last7DaysResult.rows,
            last30Days: last30DaysResult.rows[0],
            channelBreakdown: channelBreakdownResult.rows,
            topTemplates: topTemplatesResult.rows,
            failureReasons: failureReasonsResult.rows,
          },
        };
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: "Failed to get analytics",
          message: error.message,
        });
      }
    },
  );

  // GET /api/v1/notifications/digest-history
  server.get(
    "/digest-history",
    {
      schema: {
        summary: "Get digest history",
        tags: ["Notifications"],
        querystring: {
          type: "object",
          properties: {
            userId: { type: "string", format: "uuid" },
            limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
            offset: { type: "integer", minimum: 0, default: 0 },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const tenantId =
          (request.headers["x-tenant-id"] as string) || "default-tenant";
        const currentUserId = request.headers["x-user-id"] as string; // From auth middleware
        const {
          userId = currentUserId,
          limit = 20,
          offset = 0,
        } = request.query as any;

        const result = await pool.query(
          `
          SELECT
            ndh.id,
            ndh.user_id AS "userId",
            ndh.period_start AS "periodStart",
            ndh.period_end AS "periodEnd",
            ndh.frequency,
            ndh.total_notifications AS "totalNotifications",
            ndh.notification_groups AS "notificationGroups",
            ndh.channel,
            ndh.sent_at AS "sentAt",
            u.email AS "userEmail",
            u.first_name AS "userFirstName",
            u.last_name AS "userLastName"
          FROM notification_digest_history ndh
          INNER JOIN users u ON ndh.user_id = u.id
          WHERE u.tenant_id = $1
            AND ($2::uuid IS NULL OR ndh.user_id = $2)
          ORDER BY ndh.sent_at DESC
          LIMIT $3 OFFSET $4
        `,
          [tenantId, userId, limit, offset],
        );

        // Get total count
        const countResult = await pool.query(
          `
          SELECT COUNT(*)
          FROM notification_digest_history ndh
          INNER JOIN users u ON ndh.user_id = u.id
          WHERE u.tenant_id = $1
            AND ($2::uuid IS NULL OR ndh.user_id = $2)
        `,
          [tenantId, userId],
        );

        return {
          success: true,
          digests: result.rows,
          total: parseInt(countResult.rows[0].count),
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        };
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: "Failed to get digest history",
          message: error.message,
        });
      }
    },
  );
};

export default notificationHistoryRoutes;
