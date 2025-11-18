import { FastifyPluginAsync } from 'fastify';
import { SiteService } from '../services/site.service';

const siteRoutes: FastifyPluginAsync = async (server) => {
  // GET /api/v1/sites
  server.get(
    '/',
    {
      schema: {
        description: 'List sites with pagination and filters',
        tags: ['sites'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', default: 1 },
            limit: { type: 'number', default: 20 },
            status: { type: 'string', enum: ['active', 'inactive'] },
            search: { type: 'string' },
            sortBy: { type: 'string', default: 'createdAt' },
            sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: { type: 'array' },
              pagination: {
                type: 'object',
                properties: {
                  page: { type: 'number' },
                  limit: { type: 'number' },
                  total: { type: 'number' },
                  totalPages: { type: 'number' },
                },
              },
            },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const user = request.user as any;
      const query = request.query as any;

      const filters = {
        status: query.status,
        search: query.search,
      };

      const pagination = {
        page: query.page || 1,
        limit: Math.min(query.limit || 20, 100),
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      };

      const result = await SiteService.list(user.tenantId, filters, pagination);
      return result;
    }
  );

  // GET /api/v1/sites/:id
  server.get(
    '/:id',
    {
      schema: {
        description: 'Get site by ID with asset count',
        tags: ['sites'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              siteCode: { type: 'string' },
              name: { type: 'string' },
              assetCount: { type: 'number' },
            },
          },
          404: {
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const user = request.user as any;
      const { id } = request.params as { id: string };

      const site = await SiteService.getById(id, user.tenantId);

      if (!site) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Site not found',
        });
      }

      return site;
    }
  );

  // GET /api/v1/sites/:id/statistics
  server.get(
    '/:id/statistics',
    {
      schema: {
        description: 'Get site statistics (asset counts by status and criticality)',
        tags: ['sites'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const user = request.user as any;
      const { id } = request.params as { id: string };

      const stats = await SiteService.getStatistics(id, user.tenantId);

      if (!stats) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Site not found',
        });
      }

      return stats;
    }
  );

  // POST /api/v1/sites
  server.post(
    '/',
    {
      schema: {
        description: 'Create a new site',
        tags: ['sites'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            siteCode: { type: 'string', minLength: 2, maxLength: 20 },
            name: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string' },
            type: { type: 'string' },
            address: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            postalCode: { type: 'string' },
            country: { type: 'string' },
            timezone: { type: 'string' },
            contactName: { type: 'string' },
            contactEmail: { type: 'string', format: 'email' },
            contactPhone: { type: 'string' },
            isActive: { type: 'boolean' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              siteCode: { type: 'string' },
              name: { type: 'string' },
            },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const user = request.user as any;
      const body = request.body as any;

      // Generate site code if not provided
      const siteCode = body.siteCode || SiteService.generateSiteCode(body.name, user.tenantId);

      const site = await SiteService.create({
        tenantId: user.tenantId,
        siteCode,
        name: body.name,
        description: body.description,
        type: body.type,
        address: body.address,
        city: body.city,
        state: body.state,
        postalCode: body.postalCode,
        country: body.country,
        timezone: body.timezone,
        contactName: body.contactName,
        contactEmail: body.contactEmail,
        contactPhone: body.contactPhone,
        isActive: body.isActive,
      });

      return reply.status(201).send(site);
    }
  );

  // PATCH /api/v1/sites/:id
  server.patch(
    '/:id',
    {
      schema: {
        description: 'Update site',
        tags: ['sites'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string' },
            type: { type: 'string' },
            address: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            postalCode: { type: 'string' },
            country: { type: 'string' },
            timezone: { type: 'string' },
            contactName: { type: 'string' },
            contactEmail: { type: 'string', format: 'email' },
            contactPhone: { type: 'string' },
            isActive: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              siteCode: { type: 'string' },
              name: { type: 'string' },
            },
          },
          404: {
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const user = request.user as any;
      const { id } = request.params as { id: string };
      const body = request.body as any;

      const site = await SiteService.update(id, user.tenantId, body);

      if (!site) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Site not found',
        });
      }

      return site;
    }
  );

  // DELETE /api/v1/sites/:id
  server.delete(
    '/:id',
    {
      schema: {
        description: 'Delete site (soft delete, cannot delete if has assets)',
        tags: ['sites'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
          400: {
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
          404: {
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const user = request.user as any;
      const { id } = request.params as { id: string };

      try {
        const site = await SiteService.delete(id, user.tenantId);

        if (!site) {
          return reply.status(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: 'Site not found',
          });
        }

        return {
          message: 'Site deactivated successfully',
        };
      } catch (error: any) {
        if (error.message.includes('assets')) {
          return reply.status(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: error.message,
          });
        }
        throw error;
      }
    }
  );
};

export default siteRoutes;
