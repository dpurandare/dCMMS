import { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  validatorCompiler,
  serializerCompiler,
} from "fastify-type-provider-zod";
import { createAuditLogService } from "../services/audit-log.service";

// Validation schemas
const queryAuditLogsSchema = z.object({
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.number().min(1).max(10000).optional().default(1000),
  offset: z.number().min(0).optional().default(0),
});

const exportAuditLogsSchema = z.object({
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * Audit Log Routes (Admin-only)
 * Query and export tamper-proof audit logs for compliance
 */
export default async function auditLogRoutes(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  const auditService = createAuditLogService(fastify);

  // Hook to check admin permissions
  const checkAdminPermission = async (request: any, reply: any) => {
    const userRole = request.user?.role;

    if (userRole !== "super_admin" && userRole !== "tenant_admin") {
      return reply.status(403).send({
        error: "Forbidden",
        message: "Only administrators can access audit logs",
      });
    }
  };

  // ==========================================
  // Query Audit Logs
  // ==========================================

  // Get audit logs (admin-only)
  fastify.get<{
    Querystring: z.infer<typeof queryAuditLogsSchema>;
  }>(
    "/audit-logs",
    {
      preHandler: checkAdminPermission,
      schema: {
        querystring: queryAuditLogsSchema,
        tags: ["Audit"],
        description: "Query audit logs (admin-only)",
      },
    },
    async (request, reply) => {
      try {
        const tenantId = (request.user as any)?.tenantId;

        if (!tenantId) {
          return reply.status(401).send({
            error: "Unauthorized",
          });
        }

        const {
          userId,
          action,
          entityType,
          entityId,
          startDate,
          endDate,
          limit,
          offset,
        } = request.query;

        const filters = {
          userId,
          action,
          entityType,
          entityId,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
        };

        const logs = await auditService.query(tenantId, filters, limit, offset);

        return reply.send({
          count: logs.length,
          offset,
          limit,
          logs,
        });
      } catch (error) {
        fastify.log.error({ error }, "Failed to query audit logs");
        return reply.status(500).send({
          error: "Failed to query audit logs",
        });
      }
    },
  );

  // ==========================================
  // Export Audit Logs
  // ==========================================

  // Export audit logs to CSV (admin-only)
  fastify.get<{
    Querystring: z.infer<typeof exportAuditLogsSchema>;
  }>(
    "/audit-logs/export",
    {
      preHandler: checkAdminPermission,
      schema: {
        querystring: exportAuditLogsSchema,
        tags: ["Audit"],
        description: "Export audit logs to CSV (admin-only)",
      },
    },
    async (request, reply) => {
      try {
        const tenantId = (request.user as any)?.tenantId;

        if (!tenantId) {
          return reply.status(401).send({
            error: "Unauthorized",
          });
        }

        const { userId, action, entityType, entityId, startDate, endDate } =
          request.query;

        const filters = {
          userId,
          action,
          entityType,
          entityId,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
        };

        const csv = await auditService.exportToCSV(tenantId, filters);

        // Generate filename
        const timestamp = new Date().toISOString().split("T")[0];
        const fileName = `audit-logs-${timestamp}.csv`;

        reply.header("Content-Type", "text/csv");
        reply.header(
          "Content-Disposition",
          `attachment; filename="${fileName}"`,
        );

        return reply.send(csv);
      } catch (error) {
        fastify.log.error({ error }, "Failed to export audit logs");
        return reply.status(500).send({
          error: "Failed to export audit logs",
        });
      }
    },
  );

  // ==========================================
  // Audit Log Statistics
  // ==========================================

  // Get audit log statistics (admin-only)
  fastify.get<{
    Querystring: {
      startDate?: string;
      endDate?: string;
    };
  }>(
    "/audit-logs/statistics",
    {
      preHandler: checkAdminPermission,
      schema: {
        querystring: z.object({
          startDate: z.string().datetime().optional(),
          endDate: z.string().datetime().optional(),
        }),
        tags: ["Audit"],
        description: "Get audit log statistics (admin-only)",
      },
    },
    async (request, reply) => {
      try {
        const tenantId = (request.user as any)?.tenantId;

        if (!tenantId) {
          return reply.status(401).send({
            error: "Unauthorized",
          });
        }

        const { startDate, endDate } = request.query;

        const filters = {
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
        };

        const statistics = await auditService.getStatistics(tenantId, filters);

        return reply.send(statistics);
      } catch (error) {
        fastify.log.error({ error }, "Failed to get audit log statistics");
        return reply.status(500).send({
          error: "Failed to get audit log statistics",
        });
      }
    },
  );
}
