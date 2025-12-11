import { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  validatorCompiler,
  serializerCompiler,
} from "fastify-type-provider-zod";
import { db } from "../db";
import { alerts } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { createAlertNotificationHandler } from "../services/alert-notification-handler.service";

// Validation schemas
const acknowledgeAlertSchema = z.object({
  userId: z.string().uuid(),
  comment: z.string().optional(),
});

const resolveAlertSchema = z.object({
  userId: z.string().uuid(),
  comment: z.string().optional(),
  resolution: z.string().optional(),
});

const createAlertSchema = z.object({
  tenantId: z.string().uuid(),
  siteId: z.string().uuid(),
  assetId: z.string().uuid().optional(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  severity: z.enum(["critical", "high", "medium", "low", "info"]),
  ruleId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const suppressAlertSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string(),
  durationMinutes: z.number().optional(),
});

export default async function alertRoutes(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  // Initialize alert notification handler
  const alertNotificationHandler = createAlertNotificationHandler(fastify);

  // Require authentication for all routes
  fastify.addHook("onRequest", fastify.authenticate);

  // List alerts
  fastify.get<{
    Querystring: {
      tenantId: string;
      siteId?: string;
      assetId?: string;
      severity?: string;
      status?: string;
      limit?: string;
      offset?: string;
    };
  }>("/alerts", async (request, reply) => {
    try {
      const { tenantId, siteId, assetId, severity, status } = request.query;
      const limit = parseInt(request.query.limit || "50");
      const offset = parseInt(request.query.offset || "0");

      // Build where conditions
      const conditions = [eq(alerts.tenantId, tenantId)];

      if (siteId) {
        conditions.push(eq(alerts.siteId, siteId));
      }

      if (assetId) {
        conditions.push(eq(alerts.assetId, assetId));
      }

      if (severity) {
        conditions.push(eq(alerts.severity, severity as any));
      }

      if (status) {
        conditions.push(eq(alerts.status, status as any));
      }

      const alertsList = await db.query.alerts.findMany({
        where: and(...conditions),
        orderBy: [desc(alerts.triggeredAt)],
        limit,
        offset,
        with: {
          site: {
            columns: {
              name: true,
              siteId: true,
            },
          },
          asset: {
            columns: {
              name: true,
              assetId: true,
            },
          },
          acknowledgedByUser: {
            columns: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          resolvedByUser: {
            columns: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return reply.send({
        alerts: alertsList,
        pagination: {
          limit,
          offset,
          total: alertsList.length,
        },
      });
    } catch (error) {
      fastify.log.error({ error }, "Failed to list alerts");
      return reply.status(500).send({
        error: "Failed to list alerts",
      });
    }
  });

  // Get alert by ID
  fastify.get<{
    Params: { alertId: string };
  }>("/alerts/:alertId", async (request, reply) => {
    try {
      const { alertId } = request.params;

      const alert = await db.query.alerts.findFirst({
        where: eq(alerts.id, alertId),
        with: {
          site: true,
          asset: true,
          acknowledgedByUser: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          resolvedByUser: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      if (!alert) {
        return reply.status(404).send({
          error: "Alert not found",
        });
      }

      return reply.send({
        alert,
      });
    } catch (error) {
      fastify.log.error({ error }, "Failed to get alert");
      return reply.status(500).send({
        error: "Failed to get alert",
      });
    }
  });

  // Create alert (for testing or manual creation)
  fastify.post<{
    Body: z.infer<typeof createAlertSchema>;
  }>(
    "/alerts",
    {
      schema: {
        body: createAlertSchema,
      },
    },
    async (request, reply) => {
      try {
        const {
          tenantId,
          siteId,
          assetId,
          title,
          description,
          severity,
          ruleId,
          metadata,
        } = request.body;

        // Generate alert ID
        const alertId = `alert_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        // Create alert
        const [alert] = await db
          .insert(alerts)
          .values({
            tenantId,
            siteId,
            assetId,
            alertId,
            title,
            description,
            severity,
            status: "active",
            ruleId,
            triggeredAt: new Date(),
            metadata: JSON.stringify(metadata || {}),
          })
          .returning();

        fastify.log.info({ alertId: alert.id, severity }, "Alert created");

        // Trigger alert notification handler
        try {
          await alertNotificationHandler.handleAlertCreated({
            alertId: alert.alertId,
            tenantId: alert.tenantId,
            siteId: alert.siteId,
            assetId: alert.assetId || undefined,
            title: alert.title,
            description: alert.description || undefined,
            severity: alert.severity as any,
            status: alert.status as any,
            triggeredAt: alert.triggeredAt.toISOString(),
            metadata: JSON.parse(alert.metadata || "{}"),
          });
        } catch (handlerError) {
          // Log but don't fail the request
          fastify.log.error(
            { error: handlerError, alertId: alert.id },
            "Failed to trigger alert notifications",
          );
        }

        return reply.status(201).send({
          alert,
          message: "Alert created successfully",
        });
      } catch (error) {
        fastify.log.error({ error }, "Failed to create alert");
        return reply.status(500).send({
          error: "Failed to create alert",
        });
      }
    },
  );

  // Acknowledge alert
  fastify.post<{
    Params: { alertId: string };
    Body: z.infer<typeof acknowledgeAlertSchema>;
  }>(
    "/alerts/:alertId/acknowledge",
    {
      schema: {
        body: acknowledgeAlertSchema,
      },
    },
    async (request, reply) => {
      try {
        const { alertId } = request.params;
        const { userId, comment } = request.body;

        // Get alert
        const alert = await db.query.alerts.findFirst({
          where: eq(alerts.id, alertId),
        });

        if (!alert) {
          return reply.status(404).send({
            error: "Alert not found",
          });
        }

        // Check if alert is already acknowledged or resolved
        if (alert.status === "acknowledged") {
          return reply.status(400).send({
            error: "Alert is already acknowledged",
          });
        }

        if (alert.status === "resolved") {
          return reply.status(400).send({
            error: "Alert is already resolved",
          });
        }

        if (alert.status === "suppressed") {
          return reply.status(400).send({
            error: "Alert is suppressed",
          });
        }

        // Update alert
        const [updated] = await db
          .update(alerts)
          .set({
            status: "acknowledged",
            acknowledgedBy: userId,
            acknowledgedAt: new Date(),
            metadata: JSON.stringify({
              ...JSON.parse(alert.metadata || "{}"),
              acknowledgment_comment: comment,
            }),
            updatedAt: new Date(),
          })
          .where(eq(alerts.id, alertId))
          .returning();

        fastify.log.info({ alertId, userId }, "Alert acknowledged");

        // Trigger alert.acknowledged event (for notifications and escalation cancellation)
        try {
          await alertNotificationHandler.handleAlertAcknowledged({
            alertId: updated.alertId,
            tenantId: updated.tenantId,
            siteId: updated.siteId,
            assetId: updated.assetId || undefined,
            title: updated.title,
            description: updated.description || undefined,
            severity: updated.severity as any,
            status: updated.status as any,
            triggeredAt: updated.triggeredAt.toISOString(),
          });
        } catch (handlerError) {
          // Log but don't fail the request
          fastify.log.error(
            { error: handlerError, alertId },
            "Failed to trigger acknowledge notification",
          );
        }

        return reply.send({
          alert: updated,
          message: "Alert acknowledged successfully",
        });
      } catch (error) {
        fastify.log.error({ error }, "Failed to acknowledge alert");
        return reply.status(500).send({
          error: "Failed to acknowledge alert",
        });
      }
    },
  );

  // Resolve alert
  fastify.post<{
    Params: { alertId: string };
    Body: z.infer<typeof resolveAlertSchema>;
  }>(
    "/alerts/:alertId/resolve",
    {
      schema: {
        body: resolveAlertSchema,
      },
    },
    async (request, reply) => {
      try {
        const { alertId } = request.params;
        const { userId, comment, resolution } = request.body;

        // Get alert
        const alert = await db.query.alerts.findFirst({
          where: eq(alerts.id, alertId),
        });

        if (!alert) {
          return reply.status(404).send({
            error: "Alert not found",
          });
        }

        // Check if alert is already resolved
        if (alert.status === "resolved") {
          return reply.status(400).send({
            error: "Alert is already resolved",
          });
        }

        // Update alert
        const [updated] = await db
          .update(alerts)
          .set({
            status: "resolved",
            resolvedBy: userId,
            resolvedAt: new Date(),
            metadata: JSON.stringify({
              ...JSON.parse(alert.metadata || "{}"),
              resolution_comment: comment,
              resolution,
            }),
            updatedAt: new Date(),
          })
          .where(eq(alerts.id, alertId))
          .returning();

        fastify.log.info({ alertId, userId }, "Alert resolved");

        // Trigger alert.resolved event (for notifications)
        try {
          await alertNotificationHandler.handleAlertResolved({
            alertId: updated.alertId,
            tenantId: updated.tenantId,
            siteId: updated.siteId,
            assetId: updated.assetId || undefined,
            title: updated.title,
            description: updated.description || undefined,
            severity: updated.severity as any,
            status: updated.status as any,
            triggeredAt: updated.triggeredAt.toISOString(),
          });
        } catch (handlerError) {
          // Log but don't fail the request
          fastify.log.error(
            { error: handlerError, alertId },
            "Failed to trigger resolve notification",
          );
        }

        return reply.send({
          alert: updated,
          message: "Alert resolved successfully",
        });
      } catch (error) {
        fastify.log.error({ error }, "Failed to resolve alert");
        return reply.status(500).send({
          error: "Failed to resolve alert",
        });
      }
    },
  );

  // Suppress alert (temporarily disable notifications)
  fastify.post<{
    Params: { alertId: string };
    Body: z.infer<typeof suppressAlertSchema>;
  }>(
    "/alerts/:alertId/suppress",
    {
      schema: {
        body: suppressAlertSchema,
      },
    },
    async (request, reply) => {
      try {
        const { alertId } = request.params;
        const { userId, reason, durationMinutes = 60 } = request.body;

        // Get alert
        const alert = await db.query.alerts.findFirst({
          where: eq(alerts.id, alertId),
        });

        if (!alert) {
          return reply.status(404).send({
            error: "Alert not found",
          });
        }

        // Calculate suppression end time
        const suppressedUntil = new Date();
        suppressedUntil.setMinutes(
          suppressedUntil.getMinutes() + durationMinutes,
        );

        // Update alert
        const [updated] = await db
          .update(alerts)
          .set({
            status: "suppressed",
            metadata: JSON.stringify({
              ...JSON.parse(alert.metadata || "{}"),
              suppressed_by: userId,
              suppression_reason: reason,
              suppressed_at: new Date().toISOString(),
              suppressed_until: suppressedUntil.toISOString(),
            }),
            updatedAt: new Date(),
          })
          .where(eq(alerts.id, alertId))
          .returning();

        fastify.log.info(
          { alertId, userId, durationMinutes },
          "Alert suppressed",
        );

        return reply.send({
          alert: updated,
          message: `Alert suppressed for ${durationMinutes} minutes`,
        });
      } catch (error) {
        fastify.log.error({ error }, "Failed to suppress alert");
        return reply.status(500).send({
          error: "Failed to suppress alert",
        });
      }
    },
  );

  // Get alert statistics
  fastify.get<{
    Querystring: {
      tenantId: string;
      siteId?: string;
      startDate?: string;
      endDate?: string;
    };
  }>("/alerts/stats", async (request, reply) => {
    try {
      const {
        tenantId,
        siteId,
        startDate: _startDate,
        endDate: _endDate,
      } = request.query;

      // Build where conditions
      const conditions = [eq(alerts.tenantId, tenantId)];

      if (siteId) {
        conditions.push(eq(alerts.siteId, siteId));
      }

      // Get all alerts
      const allAlerts = await db.query.alerts.findMany({
        where: and(...conditions),
      });

      // Calculate statistics
      const stats = {
        total: allAlerts.length,
        active: allAlerts.filter((a) => a.status === "active").length,
        acknowledged: allAlerts.filter((a) => a.status === "acknowledged")
          .length,
        resolved: allAlerts.filter((a) => a.status === "resolved").length,
        suppressed: allAlerts.filter((a) => a.status === "suppressed").length,
        bySeverity: {
          critical: allAlerts.filter((a) => a.severity === "critical").length,
          high: allAlerts.filter((a) => a.severity === "high").length,
          medium: allAlerts.filter((a) => a.severity === "medium").length,
          low: allAlerts.filter((a) => a.severity === "low").length,
          info: allAlerts.filter((a) => a.severity === "info").length,
        },
        averageResponseTime: 0, // TODO: Calculate average time from triggered to acknowledged
        averageResolutionTime: 0, // TODO: Calculate average time from triggered to resolved
      };

      // Calculate average response time (time from triggered to acknowledged)
      const acknowledgedAlerts = allAlerts.filter((a) => a.acknowledgedAt);
      if (acknowledgedAlerts.length > 0) {
        const totalResponseTime = acknowledgedAlerts.reduce((sum, alert) => {
          const responseTime =
            new Date(alert.acknowledgedAt!).getTime() -
            new Date(alert.triggeredAt).getTime();
          return sum + responseTime;
        }, 0);
        stats.averageResponseTime = Math.round(
          totalResponseTime / acknowledgedAlerts.length / 1000 / 60,
        ); // in minutes
      }

      // Calculate average resolution time (time from triggered to resolved)
      const resolvedAlerts = allAlerts.filter((a) => a.resolvedAt);
      if (resolvedAlerts.length > 0) {
        const totalResolutionTime = resolvedAlerts.reduce((sum, alert) => {
          const resolutionTime =
            new Date(alert.resolvedAt!).getTime() -
            new Date(alert.triggeredAt).getTime();
          return sum + resolutionTime;
        }, 0);
        stats.averageResolutionTime = Math.round(
          totalResolutionTime / resolvedAlerts.length / 1000 / 60,
        ); // in minutes
      }

      return reply.send({
        stats,
      });
    } catch (error) {
      fastify.log.error({ error }, "Failed to get alert statistics");
      return reply.status(500).send({
        error: "Failed to get alert statistics",
      });
    }
  });
}
