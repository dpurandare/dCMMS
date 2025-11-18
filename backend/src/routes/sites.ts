import { FastifyPluginAsync } from 'fastify';

const siteRoutes: FastifyPluginAsync = async (server) => {
  // GET /api/v1/sites
  server.get(
    '/',
    {
      schema: {
        description: 'List sites',
        tags: ['sites'],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', default: 1 },
            limit: { type: 'number', default: 20 },
          },
        },
      },
    },
    async (request, reply) => {
      return reply.status(501).send({
        statusCode: 501,
        error: 'Not Implemented',
        message: 'Sites list not yet implemented',
      });
    }
  );

  // GET /api/v1/sites/:id
  server.get(
    '/:id',
    {
      schema: {
        description: 'Get site by ID',
        tags: ['sites'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request, reply) => {
      return reply.status(501).send({
        statusCode: 501,
        error: 'Not Implemented',
        message: 'Site detail not yet implemented',
      });
    }
  );
};

export default siteRoutes;
