import { FastifyPluginAsync } from "fastify";
import { AssetService } from "../services/asset.service";

const assetRoutes: FastifyPluginAsync = async (server) => {
  // GET /api/v1/assets
  server.get(
    "/",
    {
      schema: {
        description: "List assets with pagination and filters",
        tags: ["assets"],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          properties: {
            page: { type: "number", default: 1 },
            limit: { type: "number", default: 20 },
            siteId: { type: "string" },
            status: { type: "string" },
            criticality: { type: "string" },
            parentAssetId: { type: "string" },
            search: { type: "string" },
            sortBy: { type: "string", default: "createdAt" },
            sortOrder: {
              type: "string",
              enum: ["asc", "desc"],
              default: "desc",
            },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              data: { type: "array" },
              pagination: {
                type: "object",
                properties: {
                  page: { type: "number" },
                  limit: { type: "number" },
                  total: { type: "number" },
                  totalPages: { type: "number" },
                },
              },
            },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, _reply) => {
      const user = request.user;
      const query = request.query as any;

      const filters = {
        siteId: query.siteId,
        status: query.status,
        criticality: query.criticality,
        parentAssetId: query.parentAssetId,
        search: query.search,
      };

      const pagination = {
        page: query.page || 1,
        limit: Math.min(query.limit || 20, 100),
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      };

      const result = await AssetService.list(
        user.tenantId,
        filters,
        pagination,
      );
      return result;
    },
  );

  // GET /api/v1/assets/:id
  server.get(
    "/:id",
    {
      schema: {
        description: "Get asset by ID with children",
        tags: ["assets"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              id: { type: "string" },
              assetTag: { type: "string" },
              name: { type: "string" },
              status: { type: "string" },
              children: { type: "array" },
            },
          },
          404: {
            type: "object",
            properties: {
              statusCode: { type: "number" },
              error: { type: "string" },
              message: { type: "string" },
            },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const user = request.user;
      const { id } = request.params as { id: string };

      const asset = await AssetService.getById(id, user.tenantId);

      if (!asset) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Asset not found",
        });
      }

      return asset;
    },
  );

  // GET /api/v1/assets/:id/hierarchy
  server.get(
    "/:id/hierarchy",
    {
      schema: {
        description: "Get asset hierarchy (parent and children)",
        tags: ["assets"],
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
      const user = request.user;
      const { id } = request.params as { id: string };

      const hierarchy = await AssetService.getHierarchy(id, user.tenantId);

      if (!hierarchy) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Asset not found",
        });
      }

      return hierarchy;
    },
  );

  // POST /api/v1/assets
  server.post(
    "/",
    {
      schema: {
        description: "Create a new asset",
        tags: ["assets"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["siteId", "name", "type"],
          properties: {
            siteId: { type: "string", format: "uuid" },
            assetTag: { type: "string" },
            name: { type: "string", minLength: 1, maxLength: 255 },
            description: { type: "string" },
            type: { type: "string" },
            manufacturer: { type: "string" },
            model: { type: "string" },
            serialNumber: { type: "string" },
            location: { type: "string" },
            parentAssetId: { type: "string", format: "uuid" },
            status: {
              type: "string",
              enum: ["operational", "down", "maintenance", "retired"],
            },
            criticality: {
              type: "string",
              enum: ["critical", "high", "medium", "low"],
            },
            installationDate: { type: "string", format: "date-time" },
            warrantyExpiryDate: { type: "string", format: "date-time" },
            specifications: { type: "object" },
          },
        },
        response: {
          201: {
            type: "object",
            properties: {
              id: { type: "string" },
              assetTag: { type: "string" },
              name: { type: "string" },
              status: { type: "string" },
            },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const user = request.user;
      const body = request.body as any;

      // Generate asset tag if not provided
      const assetTag =
        body.assetTag ||
        (await AssetService.generateAssetTag(
          user.tenantId,
          body.siteId,
          body.type,
        ));

      const asset = await AssetService.create({
        tenantId: user.tenantId,
        siteId: body.siteId,
        assetTag,
        name: body.name,
        description: body.description,
        type: body.type,
        manufacturer: body.manufacturer,
        model: body.model,
        serialNumber: body.serialNumber,
        location: body.location,
        parentAssetId: body.parentAssetId,
        status: body.status,
        criticality: body.criticality,
        installationDate: body.installationDate
          ? new Date(body.installationDate)
          : undefined,
        warrantyExpiryDate: body.warrantyExpiryDate
          ? new Date(body.warrantyExpiryDate)
          : undefined,
        specifications: body.specifications,
      });

      return reply.status(201).send(asset);
    },
  );

  // PATCH /api/v1/assets/:id
  server.patch(
    "/:id",
    {
      schema: {
        description: "Update asset",
        tags: ["assets"],
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
            name: { type: "string", minLength: 1, maxLength: 255 },
            description: { type: "string" },
            type: { type: "string" },
            manufacturer: { type: "string" },
            model: { type: "string" },
            serialNumber: { type: "string" },
            location: { type: "string" },
            status: {
              type: "string",
              enum: ["operational", "down", "maintenance", "retired"],
            },
            criticality: {
              type: "string",
              enum: ["critical", "high", "medium", "low"],
            },
            installationDate: { type: "string", format: "date-time" },
            warrantyExpiryDate: { type: "string", format: "date-time" },
            lastMaintenanceDate: { type: "string", format: "date-time" },
            specifications: { type: "object" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              id: { type: "string" },
              assetTag: { type: "string" },
              name: { type: "string" },
              status: { type: "string" },
            },
          },
          404: {
            type: "object",
            properties: {
              statusCode: { type: "number" },
              error: { type: "string" },
              message: { type: "string" },
            },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const user = request.user;
      const { id } = request.params as { id: string };
      const body = request.body as any;

      const updates: any = {};

      if (body.name !== undefined) updates.name = body.name;
      if (body.description !== undefined)
        updates.description = body.description;
      if (body.type !== undefined) updates.type = body.type;
      if (body.manufacturer !== undefined)
        updates.manufacturer = body.manufacturer;
      if (body.model !== undefined) updates.model = body.model;
      if (body.serialNumber !== undefined)
        updates.serialNumber = body.serialNumber;
      if (body.location !== undefined) updates.location = body.location;
      if (body.status !== undefined) updates.status = body.status;
      if (body.criticality !== undefined)
        updates.criticality = body.criticality;
      if (body.specifications !== undefined)
        updates.specifications = body.specifications;

      if (body.installationDate)
        updates.installationDate = new Date(body.installationDate);
      if (body.warrantyExpiryDate)
        updates.warrantyExpiryDate = new Date(body.warrantyExpiryDate);
      if (body.lastMaintenanceDate)
        updates.lastMaintenanceDate = new Date(body.lastMaintenanceDate);

      const asset = await AssetService.update(id, user.tenantId, updates);

      if (!asset) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Asset not found",
        });
      }

      return asset;
    },
  );

  // DELETE /api/v1/assets/:id
  server.delete(
    "/:id",
    {
      schema: {
        description: "Delete asset (cannot delete if has children)",
        tags: ["assets"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
          400: {
            type: "object",
            properties: {
              statusCode: { type: "number" },
              error: { type: "string" },
              message: { type: "string" },
            },
          },
          404: {
            type: "object",
            properties: {
              statusCode: { type: "number" },
              error: { type: "string" },
              message: { type: "string" },
            },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const user = request.user;
      const { id } = request.params as { id: string };

      try {
        const asset = await AssetService.delete(id, user.tenantId);

        if (!asset) {
          return reply.status(404).send({
            statusCode: 404,
            error: "Not Found",
            message: "Asset not found",
          });
        }

        return {
          message: "Asset deleted successfully",
        };
      } catch (error: any) {
        if (error.message.includes("child assets")) {
          return reply.status(400).send({
            statusCode: 400,
            error: "Bad Request",
            message: error.message,
          });
        }
        throw error;
      }
    },
  );

  // GET /api/v1/assets/:id/health-score
  server.get(
    "/:id/health-score",
    {
      schema: {
        description: "Get asset health score",
        tags: ["assets"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              assetId: { type: "string" },
              score: { type: "number" },
              category: { type: "string" },
              components: { type: "object" },
              recentAlarms: { type: "number" },
              recentWorkOrders: { type: "number" },
              anomalyCount: { type: "number" },
              assetAge: { type: "number" },
              daysSinceLastMaintenance: { type: "number" },
              calculatedAt: { type: "string" },
            },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      try {
        // Import health scoring service
        const { createAssetHealthScoringService } =
          await import("../services/asset-health-scoring.service");
        const healthService = createAssetHealthScoringService(server);

        // Calculate health score
        const healthScore = await healthService.calculateHealthScore(id);

        return healthScore;
      } catch (error: any) {
        if (error.message.includes("not found")) {
          return reply.status(404).send({
            statusCode: 404,
            error: "Not Found",
            message: "Asset not found",
          });
        }
        throw error;
      }
    },
  );

  // GET /api/v1/assets/health-scores
  server.get(
    "/health-scores",
    {
      schema: {
        description: "Get health scores for multiple assets (bulk)",
        tags: ["assets"],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          properties: {
            assetIds: {
              type: "array",
              items: { type: "string" },
              description: "Array of asset IDs",
            },
          },
        },
        response: {
          200: {
            type: "array",
            items: {
              type: "object",
              properties: {
                assetId: { type: "string" },
                score: { type: "number" },
                category: { type: "string" },
                calculatedAt: { type: "string" },
              },
            },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const query = request.query as any;
      const assetIds = query.assetIds || [];

      if (!Array.isArray(assetIds) || assetIds.length === 0) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: "assetIds must be a non-empty array",
        });
      }

      try {
        // Import health scoring service
        const { createAssetHealthScoringService } =
          await import("../services/asset-health-scoring.service");
        const healthService = createAssetHealthScoringService(server);

        // Calculate health scores for all assets
        const healthScores =
          await healthService.calculateBulkHealthScores(assetIds);

        return healthScores;
      } catch (error: any) {
        server.log.error({ error }, "Failed to calculate bulk health scores");
        throw error;
      }
    },
  );
};

export default assetRoutes;
