import { FastifyPluginAsync } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { AssetService } from "../services/asset.service";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";

const assetRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  const server = fastify.withTypeProvider<ZodTypeProvider>();
  const authenticate = (fastify as any).authenticate;

  // Schema Definitions
  const AssetSchema = z.object({
    id: z.string().uuid(),
    tenantId: z.string().uuid(),
    siteId: z.string().uuid(),
    parentAssetId: z.string().uuid().nullable().optional(),
    assetId: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    type: z.string(),
    manufacturer: z.string().nullable().optional(),
    model: z.string().nullable().optional(),
    serialNumber: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    latitude: z.string().nullable().optional(), // Decimal as string from DB
    longitude: z.string().nullable().optional(),
    status: z.string(),
    tags: z.string().nullable().optional(), // JSON string
    image: z.string().nullable().optional(),
    metadata: z.string().nullable().optional(), // JSON string
    createdAt: z.date(),
    updatedAt: z.date(),
    children: z.array(z.any()).optional(), // Recursive definition hard in Zod, keeping Any for now
  });

  const CreateAssetSchema = z.object({
    siteId: z.string().uuid(),
    assetTag: z.string().optional(), // Optional, auto-generated
    name: z.string().min(1).max(255),
    description: z.string().optional(),
    type: z.enum([
      "inverter", "transformer", "panel", "disconnector", "meter",
      "turbine", "access_point", "gateway", "weather_station", "sensor", "other"
    ]).default("other"),
    manufacturer: z.string().optional(),
    model: z.string().optional(),
    serialNumber: z.string().optional(),
    location: z.string().optional(),
    parentAssetId: z.string().uuid().optional(),
    status: z.enum(["operational", "down", "maintenance", "retired"]).default("operational"),
    criticality: z.enum(["critical", "high", "medium", "low"]).optional(),
    installationDate: z.string().optional(),
    warrantyExpiryDate: z.string().optional(),
    specifications: z.any().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    tags: z.array(z.string()).optional(),
    image: z.string().optional(),
    metadata: z.any().optional(),
  });

  const UpdateAssetSchema = CreateAssetSchema.partial();

  // GET /api/v1/assets
  server.get(
    "/",
    {
      schema: {
        description: "List assets with pagination and filters",
        tags: ["assets"],
        security: [{ bearerAuth: [] }],
        querystring: z.object({
          page: z.coerce.number().default(1),
          limit: z.coerce.number().default(20),
          siteId: z.string().uuid().optional(),
          status: z.string().optional(),
          criticality: z.string().optional(),
          parentAssetId: z.string().uuid().optional(),
          search: z.string().optional(),
          sortBy: z.string().default("createdAt"),
          sortOrder: z.enum(["asc", "desc"]).default("desc"),
        }),
        response: {
          200: z.object({
            data: z.array(AssetSchema),
            pagination: z.object({
              page: z.number(),
              limit: z.number(),
              total: z.number(),
              totalPages: z.number(),
            }),
          }),
        },
      },
      preHandler: authenticate,
    },
    async (request) => {
      const user = request.user as any;
      const { page, limit, sortBy, sortOrder, ...filters } = request.query;

      const pagination = {
        page,
        limit: Math.min(limit, 100),
        sortBy,
        sortOrder,
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
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: AssetSchema,
          404: z.object({
            statusCode: z.number(),
            error: z.string(),
            message: z.string(),
          }),
        },
      },
      preHandler: authenticate,
    },
    async (request, reply) => {
      const user = request.user as any;
      const { id } = request.params;

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
        description: "Get asset hierarchy (recursive)",
        tags: ["assets"],
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: AssetSchema, // Recursive schema checks are lax in Zod usually, or use lazy
          404: z.object({
            statusCode: z.number(),
            error: z.string(),
            message: z.string(),
          }),
        },
      },
      preHandler: authenticate,
    },
    async (request, reply) => {
      const user = request.user as any;
      const { id } = request.params;

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
        body: CreateAssetSchema,
        response: {
          201: AssetSchema,
        },
      },
      preHandler: authenticate,
    },
    async (request, reply) => {
      const user = request.user as any;
      const body = request.body;

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
        assetTag,
        ...body,
        installationDate: body.installationDate ? new Date(body.installationDate) : undefined,
        warrantyExpiryDate: body.warrantyExpiryDate ? new Date(body.warrantyExpiryDate) : undefined,
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
        params: z.object({
          id: z.string().uuid(),
        }),
        body: UpdateAssetSchema,
        response: {
          200: AssetSchema,
          404: z.object({
            statusCode: z.number(),
            error: z.string(),
            message: z.string(),
          }),
        },
      },
      preHandler: authenticate,
    },
    async (request, reply) => {
      const user = request.user as any;
      const { id } = request.params;
      const body = request.body;

      const updates: any = { ...body };
      if (body.installationDate) updates.installationDate = new Date(body.installationDate);
      if (body.warrantyExpiryDate) updates.warrantyExpiryDate = new Date(body.warrantyExpiryDate);

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
        description: "Delete asset",
        tags: ["assets"],
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: z.object({
            message: z.string(),
          }),
          400: z.object({
            statusCode: z.number(),
            error: z.string(),
            message: z.string(),
          }),
          404: z.object({
            statusCode: z.number(),
            error: z.string(),
            message: z.string(),
          }),
        },
      },
      preHandler: authenticate,
    },
    async (request, reply) => {
      const user = request.user as any;
      const { id } = request.params;

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

  // POST /api/v1/assets/:id/tags
  server.post(
    "/:id/tags",
    {
      schema: {
        description: "Add tag to asset",
        tags: ["assets"],
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string().uuid(),
        }),
        body: z.object({
          tag: z.string().min(1),
        }),
        response: {
          200: z.object({
            tags: z.array(z.string()),
          }),
          404: z.object({
            statusCode: z.number(),
            error: z.string(),
            message: z.string(),
          }),
        },
      },
      preHandler: authenticate,
    },
    async (request, reply) => {
      const user = request.user as any;
      const { id } = request.params;
      const { tag } = request.body;

      try {
        const tags = await AssetService.addTag(id, user.tenantId, tag);
        return { tags };
      } catch (error: any) {
        if (error.message === "Asset not found") {
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

  // DELETE /api/v1/assets/:id/tags/:tag
  server.delete(
    "/:id/tags/:tag",
    {
      schema: {
        description: "Remove tag from asset",
        tags: ["assets"],
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string().uuid(),
          tag: z.string(),
        }),
        response: {
          200: z.object({
            tags: z.array(z.string()),
          }),
          404: z.object({
            statusCode: z.number(),
            error: z.string(),
            message: z.string(),
          }),
        },
      },
      preHandler: authenticate,
    },
    async (request, reply) => {
      const user = request.user as any;
      const { id, tag } = request.params;

      try {
        const tags = await AssetService.removeTag(id, user.tenantId, tag);
        return { tags };
      } catch (error: any) {
        if (error.message === "Asset not found") {
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
};

export default assetRoutes;
