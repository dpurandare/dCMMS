import { FastifyPluginAsync } from "fastify";
import { ModelPerformanceService } from "../services/model-performance.service";

const modelPerformanceRoutes: FastifyPluginAsync = async (server) => {
  const performanceService = new ModelPerformanceService();

  // GET /api/v1/model-performance/metrics/:modelName
  server.get(
    "/metrics/:modelName",
    {
      schema: {
        summary: "Get current performance metrics for a model",
        tags: ["Model Performance"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            modelName: { type: "string" },
          },
        },
        querystring: {
          type: "object",
          properties: {
            windowSize: { type: "integer", default: 1000 },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const { modelName } = request.params as { modelName: string };
        const { windowSize = 1000 } = request.query as { windowSize?: number };

        const metrics = await performanceService.calculateMetrics(
          modelName,
          windowSize,
        );

        return metrics;
      } catch (error: any) {
        request.log.error(error);

        if (error.message.includes("Not enough")) {
          return reply.status(400).send({ error: error.message });
        }

        return reply.status(500).send({
          error: "Failed to get model metrics",
          details: error.message,
        });
      }
    },
  );

  // GET /api/v1/model-performance/metrics/:modelName/history
  server.get(
    "/metrics/:modelName/history",
    {
      schema: {
        summary: "Get historical performance metrics",
        tags: ["Model Performance"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            modelName: { type: "string" },
          },
        },
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
        const { modelName } = request.params as { modelName: string };
        const { startDate, endDate } = request.query as {
          startDate?: string;
          endDate?: string;
        };

        const history = await performanceService.getMetricsHistory(
          modelName,
          startDate ? new Date(startDate) : undefined,
          endDate ? new Date(endDate) : undefined,
        );

        return history;
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          error: "Failed to get metrics history",
          details: error.message,
        });
      }
    },
  );

  // POST /api/v1/model-performance/compare
  server.post(
    "/compare",
    {
      schema: {
        summary: "Compare performance between two model versions",
        tags: ["Model Performance"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["modelName", "versionA", "versionB"],
          properties: {
            modelName: { type: "string" },
            versionA: { type: "string" },
            versionB: { type: "string" },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const { modelName, versionA, versionB } = request.body as {
          modelName: string;
          versionA: string;
          versionB: string;
        };

        const comparison = await performanceService.compareModelVersions(
          modelName,
          versionA,
          versionB,
        );

        return comparison;
      } catch (error: any) {
        request.log.error(error);

        if (error.message.includes("not found")) {
          return reply.status(404).send({ error: error.message });
        }

        return reply.status(500).send({
          error: "Failed to compare model versions",
          details: error.message,
        });
      }
    },
  );

  // GET /api/v1/model-performance/alerts
  server.get(
    "/alerts",
    {
      schema: {
        summary: "Get active performance alerts",
        tags: ["Model Performance"],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          properties: {
            modelName: { type: "string" },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const { modelName } = request.query as { modelName?: string };

        const alerts = await performanceService.getActiveAlerts(modelName);

        return {
          count: alerts.length,
          alerts,
        };
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          error: "Failed to get active alerts",
          details: error.message,
        });
      }
    },
  );

  // POST /api/v1/model-performance/alerts/:alertId/acknowledge
  server.post(
    "/alerts/:alertId/acknowledge",
    {
      schema: {
        summary: "Acknowledge a performance alert",
        tags: ["Model Performance"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            alertId: { type: "string" },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const { alertId } = request.params as { alertId: string };
        // Assuming alertId is a UUID, but if it's an integer in DB, we might need parsing.
        // Based on previous code, it seems to be treated as string or number depending on DB.
        // Let's assume string for now or cast if needed.
        const safeAlertId = alertId;

        await performanceService.acknowledgeAlert(
          safeAlertId,
          (request.user as any)?.id || "system",
        );

        return {
          message: "Alert acknowledged successfully",
        };
      } catch (error: any) {
        request.log.error(error);

        if (error.message.includes("not found")) {
          return reply.status(404).send({ error: error.message });
        }

        return reply.status(500).send({
          error: "Failed to acknowledge alert",
          details: error.message,
        });
      }
    },
  );

  // GET /api/v1/model-performance/accuracy-by-risk/:modelName
  server.get(
    "/accuracy-by-risk/:modelName",
    {
      schema: {
        summary: "Get prediction accuracy breakdown by risk level",
        tags: ["Model Performance"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            modelName: { type: "string" },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const { modelName } = request.params as { modelName: string };

        const accuracy =
          await performanceService.getPredictionAccuracyByRisk(modelName);

        return accuracy;
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          error: "Failed to get accuracy by risk",
          details: error.message,
        });
      }
    },
  );

  // GET /api/v1/model-performance/stats/:modelName
  server.get(
    "/stats/:modelName",
    {
      schema: {
        summary: "Get prediction statistics (total, risk distribution)",
        tags: ["Model Performance"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            modelName: { type: "string" },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const { modelName } = request.params as { modelName: string };

        const stats = await performanceService.getPredictionStats(modelName);

        return stats;
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          error: "Failed to get prediction stats",
          details: error.message,
        });
      }
    },
  );
};

export default modelPerformanceRoutes;
