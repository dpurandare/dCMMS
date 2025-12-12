import { FastifyPluginAsync } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { SiteService } from "../services/site.service";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";

const siteRoutes: FastifyPluginAsync = async (fastify) => {
  // Set up Zod validation for this plugin context
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  const server = fastify.withTypeProvider<ZodTypeProvider>();

  // Use the shared authentication preHandler (assuming it exists on the instance)
  // We need to cast server to any because withTypeProvider changes the type signature
  // and authenticate might not be visible in the ZodTypeProvider version if not typed globally
  const authenticate = (fastify as any).authenticate;

  // Schema definitions
  const SiteSchema = z.object({
    id: z.string().uuid(),
    siteId: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    type: z.string().optional(),
    energyType: z.enum(["solar", "wind", "hydro", "biomass", "geothermal", "hybrid"]).nullable().optional(),
    location: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    postalCode: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    timezone: z.string().nullable().optional(),
    contactName: z.string().nullable().optional(),
    contactEmail: z.string().email().nullable().optional(),
    contactPhone: z.string().nullable().optional(),
    assetCount: z.number().optional(),
    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
  });

  const CreateSiteSchema = z.object({
    siteId: z.string().min(2).max(20).optional(),
    name: z.string().min(1).max(255),
    description: z.string().optional(),
    type: z.string().optional(),
    energyType: z.enum(["solar", "wind", "hydro", "biomass", "geothermal", "hybrid"]).optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
    timezone: z.string().optional(),
    contactName: z.string().optional(),
    contactEmail: z.string().email().optional(),
    contactPhone: z.string().optional(),
    isActive: z.boolean().optional(),
  });

  const UpdateSiteSchema = CreateSiteSchema.partial();

  const SiteStatisticsSchema = z.object({
    site: SiteSchema,
    statistics: z.object({
      assetsByStatus: z.array(z.object({
        status: z.string(),
        count: z.number()
      })),
      assetsByCriticality: z.array(z.object({
        criticality: z.string(),
        count: z.number()
      })),
    })
  });

  // GET /api/v1/sites
  server.get(
    "/",
    {
      schema: {
        description: "List sites with pagination and filters",
        tags: ["sites"],
        security: [{ bearerAuth: [] }],
        querystring: z.object({
          page: z.coerce.number().default(1),
          limit: z.coerce.number().default(20),
          status: z.string().optional(),
          search: z.string().optional(),
          sortBy: z.string().default("createdAt"),
          sortOrder: z.enum(["asc", "desc"]).default("desc"),
        }),
        response: {
          200: z.object({
            data: z.array(SiteSchema),
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
      const { page, limit, status, search, sortBy, sortOrder } = request.query;

      const filters = {
        status,
        search,
      };

      const pagination = {
        page,
        limit: Math.min(limit, 100),
        sortBy,
        sortOrder,
      };

      const result = await SiteService.list(user.tenantId, filters, pagination);
      return result;
    },
  );

  // GET /api/v1/sites/:id
  server.get(
    "/:id",
    {
      schema: {
        description: "Get site by ID with asset count",
        tags: ["sites"],
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: SiteSchema,
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

      const site = await SiteService.getById(id, user.tenantId);

      if (!site) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Site not found",
        });
      }

      return site;
    },
  );

  // GET /api/v1/sites/:id/statistics
  server.get(
    "/:id/statistics",
    {
      schema: {
        description:
          "Get site statistics (asset counts by status and criticality)",
        tags: ["sites"],
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: SiteStatisticsSchema,
          404: z.object({
            statusCode: z.number(),
            error: z.string(),
            message: z.string(),
          }),
        }
      },
      preHandler: authenticate,
    },
    async (request, reply) => {
      const user = request.user as any;
      const { id } = request.params;

      const stats = await SiteService.getStatistics(id, user.tenantId);

      if (!stats) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Site not found",
        });
      }

      return stats;
    },
  );

  // POST /api/v1/sites
  server.post(
    "/",
    {
      schema: {
        description: "Create a new site",
        tags: ["sites"],
        security: [{ bearerAuth: [] }],
        body: CreateSiteSchema,
        response: {
          201: SiteSchema,
        },
      },
      preHandler: authenticate,
    },
    async (request, reply) => {
      const user = request.user as any;
      const body = request.body;

      // Generate site ID if not provided
      const siteId =
        body.siteId || SiteService.generateSiteCode(body.name, user.tenantId);

      const site = await SiteService.create({
        tenantId: user.tenantId,
        siteId,
        ...body,
      });

      return reply.status(201).send(site);
    },
  );

  // PATCH /api/v1/sites/:id
  server.patch(
    "/:id",
    {
      schema: {
        description: "Update site",
        tags: ["sites"],
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string().uuid(),
        }),
        body: UpdateSiteSchema,
        response: {
          200: SiteSchema,
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

      const site = await SiteService.update(id, user.tenantId, body);

      if (!site) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Site not found",
        });
      }

      return site;
    },
  );

  // DELETE /api/v1/sites/:id
  server.delete(
    "/:id",
    {
      schema: {
        description: "Delete site (soft delete, cannot delete if has assets)",
        tags: ["sites"],
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
        const site = await SiteService.delete(id, user.tenantId);

        if (!site) {
          return reply.status(404).send({
            statusCode: 404,
            error: "Not Found",
            message: "Site not found",
          });
        }

        return {
          message: "Site deactivated successfully",
        };
      } catch (error: any) {
        if (error.message.includes("assets")) {
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
};

export default siteRoutes;
