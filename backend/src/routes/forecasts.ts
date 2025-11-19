import { FastifyPluginAsync } from 'fastify';
import { forecastService } from '../services/forecast.service';

const forecastRoutes: FastifyPluginAsync = async (server) => {
  // POST /api/v1/forecasts/generation/generate
  server.post(
    '/generation/generate',
    {
      schema: {
        description: 'Generate power generation forecast using ML models',
        tags: ['forecasts'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['siteId', 'forecastHorizonHours'],
          properties: {
            siteId: { type: 'string', format: 'uuid' },
            assetId: { type: 'string', format: 'uuid' },
            forecastHorizonHours: { type: 'number', minimum: 1, maximum: 168 }, // Max 7 days
            modelType: { type: 'string', enum: ['arima', 'sarima', 'prophet'] },
            energyType: { type: 'string', enum: ['solar', 'wind'] },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              forecastCount: { type: 'number' },
              forecasts: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    forecastTimestamp: { type: 'string', format: 'date-time' },
                    predictedGenerationMw: { type: 'number' },
                    confidenceIntervalLowerMw: { type: 'number' },
                    confidenceIntervalUpperMw: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const body = request.body as any;

      const forecasts = await forecastService.generateForecast({
        siteId: body.siteId,
        assetId: body.assetId,
        forecastHorizonHours: body.forecastHorizonHours,
        modelType: body.modelType || 'sarima',
        energyType: body.energyType,
      });

      return reply.code(200).send({
        message: 'Forecast generated successfully',
        forecastCount: forecasts.length,
        forecasts,
      });
    }
  );

  // GET /api/v1/forecasts/generation/:siteId
  server.get(
    '/generation/:siteId',
    {
      schema: {
        description: 'Get generation forecasts for a site',
        tags: ['forecasts'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['siteId'],
          properties: {
            siteId: { type: 'string', format: 'uuid' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            assetId: { type: 'string', format: 'uuid' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            activeOnly: { type: 'boolean', default: true },
          },
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                siteId: { type: 'string' },
                forecastTimestamp: { type: 'string', format: 'date-time' },
                predictedGenerationMw: { type: 'number' },
                actualGenerationMw: { type: 'number' },
                modelName: { type: 'string' },
                algorithm: { type: 'string' },
              },
            },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const { siteId } = request.params as { siteId: string };
      const { assetId, startDate, endDate, activeOnly } = request.query as {
        assetId?: string;
        startDate?: string;
        endDate?: string;
        activeOnly?: boolean;
      };

      const forecasts = await forecastService.getForecasts(
        siteId,
        assetId,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined,
        activeOnly !== false
      );

      return reply.code(200).send(forecasts);
    }
  );

  // PUT /api/v1/forecasts/generation/:forecastId/actual
  server.put(
    '/generation/:forecastId/actual',
    {
      schema: {
        description: 'Update forecast with actual generation value',
        tags: ['forecasts'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['forecastId'],
          properties: {
            forecastId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['actualGenerationMw'],
          properties: {
            actualGenerationMw: { type: 'number', minimum: 0 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const { forecastId } = request.params as { forecastId: string };
      const { actualGenerationMw } = request.body as { actualGenerationMw: number };

      await forecastService.updateActualGeneration(forecastId, actualGenerationMw);

      return reply.code(200).send({
        message: 'Forecast updated with actual generation value',
      });
    }
  );

  // POST /api/v1/forecasts/accuracy/calculate
  server.post(
    '/accuracy/calculate',
    {
      schema: {
        description: 'Calculate forecast accuracy metrics for a model over a time period',
        tags: ['forecasts'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['siteId', 'modelName', 'modelVersion', 'periodStart', 'periodEnd', 'forecastHorizonHours'],
          properties: {
            siteId: { type: 'string', format: 'uuid' },
            modelName: { type: 'string' },
            modelVersion: { type: 'string' },
            periodStart: { type: 'string', format: 'date-time' },
            periodEnd: { type: 'string', format: 'date-time' },
            forecastHorizonHours: { type: 'number' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              modelName: { type: 'string' },
              meanAbsolutePercentageError: { type: 'number' },
              rootMeanSquaredErrorMw: { type: 'number' },
              rSquared: { type: 'number' },
              forecastSkillScore: { type: 'number' },
              numForecasts: { type: 'number' },
              numValidated: { type: 'number' },
            },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const body = request.body as any;

      const metrics = await forecastService.calculateAccuracyMetrics(
        body.siteId,
        body.modelName,
        body.modelVersion,
        new Date(body.periodStart),
        new Date(body.periodEnd),
        body.forecastHorizonHours
      );

      return reply.code(200).send(metrics);
    }
  );

  // GET /api/v1/forecasts/accuracy/:siteId
  server.get(
    '/accuracy/:siteId',
    {
      schema: {
        description: 'Get forecast accuracy metrics for a site',
        tags: ['forecasts'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['siteId'],
          properties: {
            siteId: { type: 'string', format: 'uuid' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            modelName: { type: 'string' },
            limit: { type: 'number', default: 10 },
          },
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                modelName: { type: 'string' },
                meanAbsolutePercentageError: { type: 'number' },
                rSquared: { type: 'number' },
                periodStart: { type: 'string', format: 'date-time' },
                periodEnd: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const { siteId } = request.params as { siteId: string };
      const { modelName, limit } = request.query as { modelName?: string; limit?: number };

      // Query accuracy metrics from database
      // (Implementation would query forecastAccuracyMetrics table)
      // For now, return empty array
      return reply.code(200).send([]);
    }
  );
};

export default forecastRoutes;
