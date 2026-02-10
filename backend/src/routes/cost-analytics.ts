import { FastifyPluginAsync } from "fastify";
import { CostAnalyticsService } from "../services/cost-analytics.service";
import { CostAnalyticsQuery, CostExportOptions } from "../models/cost.models";

import { CostCalculationService } from "../services/cost-calculation.service";

const costAnalyticsRoutes: FastifyPluginAsync = async (server) => {
  // Import CSRF protection
  const { csrfProtection } = await import('../middleware/csrf');

  const costService = new CostCalculationService();
  const analyticsService = new CostAnalyticsService(costService);

  // GET /api/v1/analytics/costs
  server.get(
    "/",
    {
      schema: {
        summary: "Get aggregate cost analytics",
        tags: ["Cost Analytics"],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          required: ["startDate", "endDate", "groupBy"],
          properties: {
            siteId: { type: "string" },
            startDate: { type: "string", format: "date" },
            endDate: { type: "string", format: "date" },
            groupBy: {
              type: "string",
              enum: ["site", "asset", "wo_type", "category", "month"],
            },
            categories: { type: "string" },
            woTypes: { type: "string" },
          },
        },
      },
      preHandler: [server.authenticate, csrfProtection],
    },
    async (request, reply) => {
      try {
        const { siteId, startDate, endDate, groupBy, categories, woTypes } =
          request.query as any;

        if (!startDate || !endDate || !groupBy) {
          return reply.status(400).send({
            error: "startDate, endDate, and groupBy are required",
          });
        }

        const query: CostAnalyticsQuery = {
          siteId: siteId as string,
          startDate: new Date(startDate as string),
          endDate: new Date(endDate as string),
          groupBy: groupBy as any,
          categories: categories
            ? ((categories as string).split(",") as any[])
            : undefined,
          woTypes: woTypes ? (woTypes as string).split(",") : undefined,
        };

        const analytics = await analyticsService.getCostAnalytics(query);

        return analytics;
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          error: "Failed to get cost analytics",
          details: error.message,
        });
      }
    },
  );

  // GET /api/v1/analytics/costs/trends
  server.get(
    "/trends",
    {
      schema: {
        summary: "Get cost trends over time (monthly aggregates)",
        tags: ["Cost Analytics"],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          properties: {
            siteId: { type: "string" },
            startDate: { type: "string", format: "date" },
            endDate: { type: "string", format: "date" },
          },
        },
      },
      preHandler: [server.authenticate, csrfProtection],
    },
    async (request, reply) => {
      try {
        const { siteId, startDate, endDate } = request.query as any;

        const trends = await analyticsService.getCostTrends(
          siteId as string,
          startDate ? new Date(startDate as string) : undefined,
          endDate ? new Date(endDate as string) : undefined,
        );

        return {
          count: trends.length,
          trends,
        };
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          error: "Failed to get cost trends",
          details: error.message,
        });
      }
    },
  );

  // GET /api/v1/analytics/costs/by-site
  server.get(
    "/by-site",
    {
      schema: {
        summary: "Get cost breakdown by site",
        tags: ["Cost Analytics"],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          required: ["startDate", "endDate"],
          properties: {
            startDate: { type: "string", format: "date" },
            endDate: { type: "string", format: "date" },
          },
        },
      },
      preHandler: [server.authenticate, csrfProtection],
    },
    async (request, reply) => {
      try {
        const { startDate, endDate } = request.query as any;

        if (!startDate || !endDate) {
          return reply.status(400).send({
            error: "startDate and endDate are required",
          });
        }

        const costBySite = await analyticsService.getCostBySite(
          new Date(startDate as string),
          new Date(endDate as string),
        );

        return {
          count: costBySite.length,
          sites: costBySite,
        };
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          error: "Failed to get cost by site",
          details: error.message,
        });
      }
    },
  );

  // GET /api/v1/analytics/costs/by-wo-type
  server.get(
    "/by-wo-type",
    {
      schema: {
        summary: "Get cost breakdown by work order type",
        tags: ["Cost Analytics"],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          properties: {
            siteId: { type: "string" },
            startDate: { type: "string", format: "date" },
            endDate: { type: "string", format: "date" },
          },
        },
      },
      preHandler: [server.authenticate, csrfProtection],
    },
    async (request, reply) => {
      try {
        const { siteId, startDate, endDate } = request.query as any;

        const costByWOType = await analyticsService.getCostByWOType(
          siteId as string,
          startDate ? new Date(startDate as string) : undefined,
          endDate ? new Date(endDate as string) : undefined,
        );

        return {
          count: costByWOType.length,
          woTypes: costByWOType,
        };
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          error: "Failed to get cost by WO type",
          details: error.message,
        });
      }
    },
  );

  // GET /api/v1/analytics/costs/variance
  server.get(
    "/variance",
    {
      schema: {
        summary: "Get cost variance (current vs previous period)",
        tags: ["Cost Analytics"],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          properties: {
            siteId: { type: "string" },
            currentPeriodStart: { type: "string", format: "date" },
            currentPeriodEnd: { type: "string", format: "date" },
          },
        },
      },
      preHandler: [server.authenticate, csrfProtection],
    },
    async (request, reply) => {
      try {
        const { siteId, currentPeriodStart, currentPeriodEnd } =
          request.query as any;

        const variance = await analyticsService.getCostVariance(
          siteId as string,
          currentPeriodStart
            ? new Date(currentPeriodStart as string)
            : undefined,
          currentPeriodEnd ? new Date(currentPeriodEnd as string) : undefined,
        );

        return variance;
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          error: "Failed to get cost variance",
          details: error.message,
        });
      }
    },
  );

  // GET /api/v1/analytics/costs/by-asset
  server.get(
    "/by-asset",
    {
      schema: {
        summary: "Get cost per asset",
        tags: ["Cost Analytics"],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          properties: {
            siteId: { type: "string" },
            startDate: { type: "string", format: "date" },
            endDate: { type: "string", format: "date" },
          },
        },
      },
      preHandler: [server.authenticate, csrfProtection],
    },
    async (request, reply) => {
      try {
        const { siteId, startDate, endDate } = request.query as any;

        const costPerAsset = await analyticsService.getCostPerAsset(
          siteId as string,
          startDate ? new Date(startDate as string) : undefined,
          endDate ? new Date(endDate as string) : undefined,
        );

        return {
          count: costPerAsset.length,
          assets: costPerAsset,
        };
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          error: "Failed to get cost per asset",
          details: error.message,
        });
      }
    },
  );

  // GET /api/v1/analytics/costs/breakdown
  server.get(
    "/breakdown",
    {
      schema: {
        summary: "Get category-wise cost breakdown",
        tags: ["Cost Analytics"],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          properties: {
            siteId: { type: "string" },
            startDate: { type: "string", format: "date" },
            endDate: { type: "string", format: "date" },
          },
        },
      },
      preHandler: [server.authenticate, csrfProtection],
    },
    async (request, reply) => {
      try {
        const { siteId, startDate, endDate } = request.query as any;

        const breakdown = await analyticsService.getCostBreakdown(
          siteId as string,
          startDate ? new Date(startDate as string) : undefined,
          endDate ? new Date(endDate as string) : undefined,
        );

        return breakdown;
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          error: "Failed to get cost breakdown",
          details: error.message,
        });
      }
    },
  );

  // POST /api/v1/analytics/costs/export
  server.post(
    "/export",
    {
      schema: {
        summary: "Export cost data (CSV, PDF, Excel)",
        tags: ["Cost Analytics"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["query", "options"],
          properties: {
            query: {
              type: "object",
              properties: {
                siteId: { type: "string" },
                startDate: { type: "string", format: "date" },
                endDate: { type: "string", format: "date" },
                groupBy: {
                  type: "string",
                  enum: ["site", "asset", "wo_type", "category", "month"],
                },
              },
            },
            options: {
              type: "object",
              properties: {
                format: { type: "string", enum: ["csv", "pdf", "excel"] },
                includeBreakdown: { type: "boolean" },
                includeTrends: { type: "boolean" },
                includeComparison: { type: "boolean" },
              },
            },
          },
        },
      },
      preHandler: [server.authenticate, csrfProtection],
    },
    async (request, reply) => {
      try {
        const { query, options } = request.body as any;

        if (!query || !options) {
          return reply.status(400).send({
            error: "query and options are required",
          });
        }

        const costQuery: CostAnalyticsQuery = {
          ...query,
          startDate: new Date(query.startDate),
          endDate: new Date(query.endDate),
        };

        const exportOptions: CostExportOptions = options;

        const exportData = await analyticsService.exportCostData(
          costQuery,
          exportOptions,
        );

        // Set headers for download
        reply.header("Content-Type", exportData.mimeType);
        reply.header(
          "Content-Disposition",
          `attachment; filename="${exportData.filename}"`,
        );

        return reply.send(exportData.data);
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          error: "Failed to export cost data",
          details: error.message,
        });
      }
    },
  );
};

export default costAnalyticsRoutes;
