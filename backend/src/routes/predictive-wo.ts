import { FastifyPluginAsync } from "fastify";
import { PredictiveWOService } from "../services/predictive-wo.service";

const predictiveWORoutes: FastifyPluginAsync = async (server) => {
  const predictiveWOService = new PredictiveWOService();

  // POST /api/v1/predictive-wo/run
  server.post(
    "/run",
    {
      schema: {
        summary: "Manually trigger predictive maintenance job",
        tags: ["Predictive Work Orders"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          properties: {
            modelName: { type: "string", default: "predictive_maintenance" },
          },
        },
        response: {
          200: {
            description: "Job completed successfully",
            type: "object",
            properties: {
              message: { type: "string" },
              stats: {
                type: "object",
                properties: {
                  totalCreated: { type: "integer" },
                  highRisk: { type: "integer" },
                  criticalRisk: { type: "integer" },
                  deduplicatedCount: { type: "integer" },
                  notificationsSent: { type: "integer" },
                },
              },
            },
          },
          401: {
            description: "Unauthorized",
            type: "object",
            properties: { error: { type: "string" } },
          },
          403: {
            description: "Forbidden (admin only)",
            type: "object",
            properties: { error: { type: "string" } },
          },
          500: {
            description: "Internal Server Error",
            type: "object",
            properties: { error: { type: "string" } },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const { modelName = "predictive_maintenance" } = request.body as {
          modelName?: string;
        };

        // Check for admin role (assuming user is attached to request)
        const user = request.user;
        if (user.role !== "admin") {
          return reply.status(403).send({ error: "Forbidden" });
        }

        const stats =
          await predictiveWOService.runPredictiveMaintenanceJob(modelName);

        return {
          message: "Predictive maintenance job completed successfully",
          stats,
        };
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          error: error.message || "Failed to run predictive maintenance job",
        });
      }
    },
  );

  // GET /api/v1/predictive-wo/stats
  server.get(
    "/stats",
    {
      schema: {
        summary: "Get predictive work order statistics",
        tags: ["Predictive Work Orders"],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          properties: {
            startDate: { type: "string", format: "date" },
            endDate: { type: "string", format: "date" },
          },
        },
        response: {
          200: {
            description: "Statistics",
            type: "object",
            properties: {
              totalPredictiveWOs: { type: "integer" },
              pending: { type: "integer" },
              approved: { type: "integer" },
              rejected: { type: "integer" },
              completed: { type: "integer" },
              approvalRate: { type: "number" },
              avgTimeToApproval: {
                type: "number",
                description: "Average time in hours",
              },
              truePositives: { type: "integer" },
              falsePositives: { type: "integer" },
            },
          },
          401: {
            description: "Unauthorized",
            type: "object",
            properties: { error: { type: "string" } },
          },
          500: {
            description: "Internal Server Error",
            type: "object",
            properties: { error: { type: "string" } },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const { startDate, endDate } = request.query as {
          startDate?: string;
          endDate?: string;
        };
        const start = startDate ? new Date(startDate) : undefined;
        const end = endDate ? new Date(endDate) : undefined;

        const stats = await predictiveWOService.getStats(start, end);

        return stats;
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          error: error.message || "Failed to get statistics",
        });
      }
    },
  );

  // POST /api/v1/predictive-wo/cleanup
  server.post(
    "/cleanup",
    {
      schema: {
        summary: "Cleanup deduplication cache",
        tags: ["Predictive Work Orders"],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: "Cache cleaned up",
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
          401: {
            description: "Unauthorized",
            type: "object",
            properties: { error: { type: "string" } },
          },
          403: {
            description: "Forbidden (admin only)",
            type: "object",
            properties: { error: { type: "string" } },
          },
          500: {
            description: "Internal Server Error",
            type: "object",
            properties: { error: { type: "string" } },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        // Check for admin role
        const user = request.user;
        if (user.role !== "admin") {
          return reply.status(403).send({ error: "Forbidden" });
        }

        predictiveWOService.cleanupDeduplicationCache();

        return {
          message: "Deduplication cache cleaned up successfully",
        };
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          error: error.message || "Failed to cleanup cache",
        });
      }
    },
  );
};

export default predictiveWORoutes;
