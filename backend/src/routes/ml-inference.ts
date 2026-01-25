import { FastifyPluginAsync } from "fastify";
import { MLInferenceService } from "../services/ml-inference.service";

const mlInferenceRoutes: FastifyPluginAsync = async (server) => {
  // Import CSRF protection
  const { csrfProtection } = await import('../middleware/csrf');
  
  const inferenceService = new MLInferenceService();

  // GET /api/v1/ml-inference/predict/asset/:assetId
  server.get(
    "/predict/asset/:assetId",
    {
      schema: {
        summary: "Get prediction for a single asset",
        tags: ["ML Inference"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            assetId: { type: "string" },
          },
        },
        querystring: {
          type: "object",
          properties: {
            modelName: { type: "string" },
            useCache: { type: "boolean", default: true },
          },
        },
      },
      preHandler: [server.authenticate, csrfProtection],
    },
    async (request, reply) => {
      try {
        const { assetId } = request.params as { assetId: string };
        const { modelName = "default-model", useCache = true } =
          request.query as { modelName?: string; useCache?: boolean };

        const prediction = await inferenceService.predictSingle(
          modelName,
          assetId,
          useCache,
        );

        return prediction;
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          error: error.message || "Prediction failed",
        });
      }
    },
  );

  // GET /api/v1/ml-inference/predict/all
  server.get(
    "/predict/all",
    {
      schema: {
        summary: "Get predictions for all assets",
        tags: ["ML Inference"],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          properties: {
            modelName: { type: "string" },
            riskLevel: { type: "string" },
          },
        },
      },
      preHandler: [server.authenticate, csrfProtection],
    },
    async (request, reply) => {
      try {
        const { modelName = "default-model", riskLevel } = request.query as {
          modelName?: string;
          riskLevel?: string;
        };

        const response = await inferenceService.predictAllAssets(
          modelName,
          riskLevel,
        );

        return response;
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          error: error.message || "Prediction failed",
        });
      }
    },
  );

  // GET /api/v1/ml-inference/predictions/logs
  server.get(
    "/predictions/logs",
    {
      schema: {
        summary: "Get prediction logs",
        tags: ["ML Inference"],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          properties: {
            limit: { type: "integer", default: 100 },
          },
        },
      },
      preHandler: [server.authenticate, csrfProtection],
    },
    async (request, reply) => {
      try {
        const { limit = 100 } = request.query as { limit?: number };

        const logs = inferenceService.getPredictionLogs(limit);

        return logs;
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          error: error.message || "Failed to get prediction logs",
        });
      }
    },
  );

  // POST /api/v1/ml-inference/predictions/cache/clear
  server.post(
    "/predictions/cache/clear",
    {
      schema: {
        summary: "Clear prediction cache",
        tags: ["ML Inference"],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [server.authenticate, csrfProtection],
    },
    async (request, reply) => {
      try {
        inferenceService.clearCache();

        return {
          message: "Cache cleared successfully",
        };
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          error: error.message || "Failed to clear cache",
        });
      }
    },
  );
};

export default mlInferenceRoutes;
