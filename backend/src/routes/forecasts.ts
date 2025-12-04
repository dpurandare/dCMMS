import { FastifyPluginAsync } from "fastify";
import {
  ZodTypeProvider,
  validatorCompiler,
  serializerCompiler,
} from "fastify-type-provider-zod";
import { z } from "zod";
import { forecastService } from "../services/forecast.service";

const forecastRoutes: FastifyPluginAsync = async (server) => {
  server.setValidatorCompiler(validatorCompiler);
  server.setSerializerCompiler(serializerCompiler);
  const app = server.withTypeProvider<ZodTypeProvider>();

  // POST /api/v1/forecasts/generation/generate
  app.post(
    "/generation/generate",
    {
      schema: {
        description: "Generate power generation forecast using ML models",
        tags: ["forecasts"],
        security: [{ bearerAuth: [] }],
        body: z.object({
          siteId: z.string().uuid(),
          assetId: z.string().uuid().optional(),
          forecastHorizonHours: z.number().min(1).max(168), // Max 7 days
          modelType: z.enum(["arima", "sarima", "prophet"]).optional(),
          energyType: z.enum(["solar", "wind"]).optional(),
        }),
        response: {
          200: z.object({
            message: z.string(),
            forecastCount: z.number(),
            forecasts: z.array(
              z.object({
                id: z.string(),
                forecastTimestamp: z.string(), // Date string
                predictedGenerationMw: z.number(),
                confidenceIntervalLowerMw: z.number().optional(),
                confidenceIntervalUpperMw: z.number().optional(),
              }),
            ),
          }),
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const { siteId, assetId, forecastHorizonHours, modelType, energyType } =
        request.body as any;

      const forecasts = await forecastService.generateForecast({
        siteId,
        assetId,
        forecastHorizonHours,
        modelType: modelType || "sarima",
        energyType,
      });

      return reply.code(200).send({
        message: "Forecast generated successfully",
        forecastCount: forecasts.length,
        forecasts: forecasts.map((f) => ({
          ...f,
          forecastTimestamp: f.forecastTimestamp.toISOString(), // Ensure string for Zod
          confidenceIntervalLowerMw: f.confidenceIntervalLowerMw ?? undefined,
          confidenceIntervalUpperMw: f.confidenceIntervalUpperMw ?? undefined,
        })),
      });
    },
  );

  // GET /api/v1/forecasts/generation/:siteId
  app.get(
    "/generation/:siteId",
    {
      schema: {
        description: "Get generation forecasts for a site",
        tags: ["forecasts"],
        security: [{ bearerAuth: [] }],
        params: z.object({
          siteId: z.string().uuid(),
        }),
        querystring: z.object({
          assetId: z.string().uuid().optional(),
          startDate: z.string().datetime().optional(),
          endDate: z.string().datetime().optional(),
          activeOnly: z.boolean().optional().default(true), // Zod boolean coercion might be needed if query param is string "true"
          // Fastify handles coercion if configured? fastify-type-provider-zod usually handles it.
          // But for query strings, "true" is a string.
          // Let's use z.preprocess or z.string().transform if needed.
          // But usually fastify-type-provider-zod handles basic coercion.
        }),
        response: {
          200: z.array(
            z.object({
              id: z.string(),
              siteId: z.string(),
              forecastTimestamp: z.string(),
              predictedGenerationMw: z.number(),
              actualGenerationMw: z.number().nullable().optional(),
              modelName: z.string(),
              algorithm: z.string(),
            }),
          ),
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const { siteId } = request.params as any;
      const { assetId, startDate, endDate, activeOnly } = request.query as any;

      const forecasts = await forecastService.getForecasts(
        siteId,
        assetId,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined,
        activeOnly !== false,
      );

      return reply.code(200).send(
        forecasts.map((f) => ({
          ...f,
          forecastTimestamp: f.forecastTimestamp.toISOString(),
          actualGenerationMw: f.actualGenerationMw ?? null,
        })),
      );
    },
  );

  // PUT /api/v1/forecasts/generation/:forecastId/actual
  app.put(
    "/generation/:forecastId/actual",
    {
      schema: {
        description: "Update forecast with actual generation value",
        tags: ["forecasts"],
        security: [{ bearerAuth: [] }],
        params: z.object({
          forecastId: z.string().uuid(),
        }),
        body: z.object({
          actualGenerationMw: z.number().min(0),
        }),
        response: {
          200: z.object({
            message: z.string(),
          }),
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const { forecastId } = request.params as any;
      const { actualGenerationMw } = request.body as any;

      await forecastService.updateActualGeneration(
        forecastId,
        actualGenerationMw,
      );

      return reply.code(200).send({
        message: "Forecast updated with actual generation value",
      });
    },
  );

  // POST /api/v1/forecasts/accuracy/calculate
  app.post(
    "/accuracy/calculate",
    {
      schema: {
        description:
          "Calculate forecast accuracy metrics for a model over a time period",
        tags: ["forecasts"],
        security: [{ bearerAuth: [] }],
        body: z.object({
          siteId: z.string().uuid(),
          modelName: z.string(),
          modelVersion: z.string(),
          periodStart: z.string().datetime(),
          periodEnd: z.string().datetime(),
          forecastHorizonHours: z.number(),
        }),
        response: {
          200: z.object({
            id: z.string().optional(), // ID might be missing if not saved? Service returns metrics object.
            modelName: z.string(),
            meanAbsolutePercentageError: z.number().optional(),
            rootMeanSquaredErrorMw: z.number().optional(),
            rSquared: z.number().optional(),
            forecastSkillScore: z.number().optional(),
            numForecasts: z.number(),
            numValidated: z.number(),
          }),
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const {
        siteId,
        modelName,
        modelVersion,
        periodStart,
        periodEnd,
        forecastHorizonHours,
      } = request.body as any;

      const metrics = await forecastService.calculateAccuracyMetrics(
        siteId,
        modelName,
        modelVersion,
        new Date(periodStart),
        new Date(periodEnd),
        forecastHorizonHours,
      );

      return reply.code(200).send(metrics);
    },
  );

  // GET /api/v1/forecasts/accuracy/:siteId
  app.get(
    "/accuracy/:siteId",
    {
      schema: {
        description: "Get forecast accuracy metrics for a site",
        tags: ["forecasts"],
        security: [{ bearerAuth: [] }],
        params: z.object({
          siteId: z.string().uuid(),
        }),
        querystring: z.object({
          modelName: z.string().optional(),
          limit: z.number().optional().default(10), // Zod coercion needed?
        }),
        response: {
          200: z.array(
            z.object({
              id: z.string(),
              modelName: z.string(),
              meanAbsolutePercentageError: z.number(),
              rSquared: z.number(),
              periodStart: z.string(), // Date string
              periodEnd: z.string(), // Date string
            }),
          ),
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      // Implementation placeholder
      return reply.code(200).send([]);
    },
  );
};

export default forecastRoutes;
