import { FastifyPluginAsync } from 'fastify';
import { MLExplainabilityService } from '../services/ml-explainability.service';

const mlExplainabilityRoutes: FastifyPluginAsync = async (server) => {
  const explainabilityService = new MLExplainabilityService();

  // POST /api/v1/ml-explainability/explain
  server.post(
    '/explain',
    {
      schema: {
        summary: 'Generate explanation for a prediction',
        tags: ['ML Explainability'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['modelName', 'assetId'],
          properties: {
            modelName: { type: 'string' },
            assetId: { type: 'string' },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const { modelName, assetId } = request.body as { modelName: string; assetId: string };

        const explanation = await explainabilityService.getExplanation(modelName, assetId);
        const recommendation = explainabilityService.getRecommendation(explanation);

        return {
          explanation,
          recommendation,
        };
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          error: error.message || 'Failed to generate explanation',
        });
      }
    }
  );

  // GET /api/v1/ml-explainability/explain/waterfall/:assetId
  server.get(
    '/explain/waterfall/:assetId',
    {
      schema: {
        summary: 'Get waterfall chart data',
        tags: ['ML Explainability'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            assetId: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            modelName: { type: 'string' },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const { assetId } = request.params as { assetId: string };
        const { modelName = 'default-model' } = request.query as { modelName?: string };

        const waterfallData = await explainabilityService.getWaterfallData(modelName, assetId);

        return waterfallData;
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          error: error.message || 'Failed to get waterfall data',
        });
      }
    }
  );

  // POST /api/v1/ml-explainability/explain/feature-importance
  server.post(
    '/explain/feature-importance',
    {
      schema: {
        summary: 'Get global feature importance',
        tags: ['ML Explainability'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['modelName'],
          properties: {
            modelName: { type: 'string' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const { modelName, startDate, endDate } = request.body as { modelName: string; startDate?: string; endDate?: string };

        const importance = await explainabilityService.getFeatureImportance(
          modelName,
          startDate ? new Date(startDate) : undefined,
          endDate ? new Date(endDate) : undefined
        );

        return importance;
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          error: error.message || 'Failed to get feature importance',
        });
      }
    }
  );
};

export default mlExplainabilityRoutes;
