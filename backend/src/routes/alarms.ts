import { FastifyPluginAsync } from "fastify";
import { pool } from "../db";
import { z } from "zod";

const alarmsRoutes: FastifyPluginAsync = async (server) => {
  // GET /api/v1/alarms
  server.get(
    "/",
    {
      schema: {
        summary: "List alarms",
        tags: ["Alarms"],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["active", "acknowledged", "resolved"],
            },
            severity: { type: "string", enum: ["INFO", "WARNING", "CRITICAL"] },
            siteId: { type: "string", format: "uuid" },
            assetId: { type: "string", format: "uuid" },
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
        const tenantId = (request.user as any)?.tenantId || "default-tenant";
        const {
          status,
          severity,
          siteId,
          assetId,
          startDate,
          endDate,
          limit = 50,
          offset = 0,
        } = request.query as any;

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

        const result = await pool.query(query, params);

        // Get total count
        let countQuery = "SELECT COUNT(*) FROM alarms a WHERE a.tenant_id = $1";
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

        const countResult = await pool.query(countQuery, countParams);

        return {
          success: true,
          alarms: result.rows,
          total: parseInt(countResult.rows[0].count),
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        };
      } catch (error: any) {
        request.log.error({ error }, "Error listing alarms");
        return reply.status(500).send({
          success: false,
          error: "Failed to list alarms",
          message: error.message,
        });
      }
    },
  );

  // GET /api/v1/alarms/active
  server.get(
    "/active",
    {
      schema: {
        summary: "Get active alarms",
        tags: ["Alarms"],
        security: [{ bearerAuth: [] }],
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const tenantId = (request.user as any)?.tenantId || "default-tenant";

        const result = await pool.query(
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
          [tenantId],
        );

        return {
          success: true,
          alarms: result.rows,
          count: result.rows.length,
        };
      } catch (error: any) {
        request.log.error({ error }, "Error getting active alarms");
        return reply.status(500).send({
          success: false,
          error: "Failed to get active alarms",
          message: error.message,
        });
      }
    },
  );

  // GET /api/v1/alarms/stats
  server.get(
    "/stats",
    {
      schema: {
        summary: "Get alarm statistics",
        tags: ["Alarms"],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          properties: {
            startDate: { type: "string", format: "date-time" },
            endDate: { type: "string", format: "date-time" },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const tenantId = (request.user as any)?.tenantId || "default-tenant";
        const { startDate, endDate } = request.query as any;

        // Date range (default: last 30 days)
        const start =
          startDate ||
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const end = endDate || new Date().toISOString();

        // Get statistics
        const [
          overallResult,
          severityBreakdownResult,
          statusBreakdownResult,
          topAssetsResult,
        ] = await Promise.all([
          // Overall stats
          pool.query(
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
            [tenantId, start, end],
          ),

          // Severity breakdown
          pool.query(
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
            [tenantId, start, end],
          ),

          // Status breakdown
          pool.query(
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
            [tenantId, start, end],
          ),

          // Top assets with most alarms
          pool.query(
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
            [tenantId, start, end],
          ),
        ]);

        return {
          success: true,
          period: { start, end },
          overall: overallResult.rows[0],
          severityBreakdown: severityBreakdownResult.rows,
          statusBreakdown: statusBreakdownResult.rows,
          topAssets: topAssetsResult.rows,
        };
      } catch (error: any) {
        request.log.error({ error }, "Error getting alarm stats");
        return reply.status(500).send({
          success: false,
          error: "Failed to get alarm statistics",
          message: error.message,
        });
      }
    },
  );

  // GET /api/v1/alarms/:id
  server.get(
    "/:id",
    {
      schema: {
        summary: "Get alarm details",
        tags: ["Alarms"],
        security: [{ bearerAuth: [] }],
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
        const tenantId = (request.user as any)?.tenantId || "default-tenant";

        const result = await pool.query(
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
          [id, tenantId],
        );

        if (result.rows.length === 0) {
          return reply.status(404).send({
            success: false,
            error: "Alarm not found",
          });
        }

        return {
          success: true,
          alarm: result.rows[0],
        };
      } catch (error: any) {
        request.log.error({ error }, "Error getting alarm");
        return reply.status(500).send({
          success: false,
          error: "Failed to get alarm",
          message: error.message,
        });
      }
    },
  );

  // POST /api/v1/alarms/:id/acknowledge
  server.post(
    "/:id/acknowledge",
    {
      schema: {
        summary: "Acknowledge alarm",
        tags: ["Alarms"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          properties: {
            comment: { type: "string" },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { comment } = request.body as { comment?: string };
        const tenantId = (request.user as any)?.tenantId || "default-tenant";
        const userId = (request.user as any)?.id;

        if (!userId) {
          return reply.status(401).send({
            success: false,
            error: "User authentication required",
          });
        }

        // Check if alarm exists and belongs to tenant
        const alarmCheck = await pool.query(
          "SELECT id, status, acknowledged_at FROM alarms WHERE id = $1 AND tenant_id = $2",
          [id, tenantId],
        );

        if (alarmCheck.rows.length === 0) {
          return reply.status(404).send({
            success: false,
            error: "Alarm not found",
          });
        }

        if (alarmCheck.rows[0].acknowledged_at) {
          return reply.status(400).send({
            success: false,
            error: "Alarm already acknowledged",
            acknowledgedAt: alarmCheck.rows[0].acknowledged_at,
          });
        }

        // Acknowledge alarm
        const result = await pool.query(
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
          [userId, comment || "", id, tenantId],
        );

        request.log.info(`Alarm ${id} acknowledged by user ${userId}`);

        return {
          success: true,
          alarm: result.rows[0],
          message: "Alarm acknowledged successfully",
        };
      } catch (error: any) {
        request.log.error({ error }, "Error acknowledging alarm");
        return reply.status(500).send({
          success: false,
          error: "Failed to acknowledge alarm",
          message: error.message,
        });
      }
    },
  );

  // POST /api/v1/alarms/:id/resolve
  server.post(
    "/:id/resolve",
    {
      schema: {
        summary: "Resolve alarm",
        tags: ["Alarms"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          properties: {
            comment: { type: "string" },
            rootCause: { type: "string" },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { comment, rootCause } = request.body as {
          comment?: string;
          rootCause?: string;
        };
        const tenantId = (request.user as any)?.tenantId || "default-tenant";
        const userId = (request.user as any)?.id;

        if (!userId) {
          return reply.status(401).send({
            success: false,
            error: "User authentication required",
          });
        }

        // Check if alarm exists
        const alarmCheck = await pool.query(
          "SELECT id, status, resolved_at FROM alarms WHERE id = $1 AND tenant_id = $2",
          [id, tenantId],
        );

        if (alarmCheck.rows.length === 0) {
          return reply.status(404).send({
            success: false,
            error: "Alarm not found",
          });
        }

        if (alarmCheck.rows[0].resolved_at) {
          return reply.status(400).send({
            success: false,
            error: "Alarm already resolved",
            resolvedAt: alarmCheck.rows[0].resolved_at,
          });
        }

        // Resolve alarm
        const result = await pool.query(
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
          [userId, comment || "", rootCause || "", id, tenantId],
        );

        request.log.info(`Alarm ${id} resolved by user ${userId}`);

        return {
          success: true,
          alarm: result.rows[0],
          message: "Alarm resolved successfully",
        };
      } catch (error: any) {
        request.log.error({ error }, "Error resolving alarm");
        return reply.status(500).send({
          success: false,
          error: "Failed to resolve alarm",
          message: error.message,
        });
      }
    },
  );

  // POST /api/v1/alarms/:id/comment
  server.post(
    "/:id/comment",
    {
      schema: {
        summary: "Add comment to alarm",
        tags: ["Alarms"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          required: ["comment"],
          properties: {
            comment: { type: "string" },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { comment } = request.body as { comment: string };
        const tenantId = (request.user as any)?.tenantId || "default-tenant";
        const userId = (request.user as any)?.id;

        if (!userId) {
          return reply.status(401).send({
            success: false,
            error: "User authentication required",
          });
        }

        // Check if alarm exists
        const alarmCheck = await pool.query(
          "SELECT id FROM alarms WHERE id = $1 AND tenant_id = $2",
          [id, tenantId],
        );

        if (alarmCheck.rows.length === 0) {
          return reply.status(404).send({
            success: false,
            error: "Alarm not found",
          });
        }

        // Add comment to metadata
        const commentData = {
          userId,
          comment,
          timestamp: new Date().toISOString(),
        };

        await pool.query(
          `
          UPDATE alarms
          SET metadata = jsonb_set(
            COALESCE(metadata, '{}'::jsonb),
            '{comments}',
            COALESCE(metadata->'comments', '[]'::jsonb) || $1::jsonb
          )
          WHERE id = $2 AND tenant_id = $3
        `,
          [JSON.stringify(commentData), id, tenantId],
        );

        return {
          success: true,
          message: "Comment added successfully",
        };
      } catch (error: any) {
        request.log.error({ error }, "Error adding comment");
        return reply.status(500).send({
          success: false,
          error: "Failed to add comment",
          message: error.message,
        });
      }
    },
  );
};

export default alarmsRoutes;
