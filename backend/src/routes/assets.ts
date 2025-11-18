import { FastifyPluginAsync } from 'fastify';

const assetRoutes: FastifyPluginAsync = async (server) => {
  // GET /api/v1/assets
  server.get(
    '/',
    {
      schema: {
        description: 'List assets with pagination',
        tags: ['assets'],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', default: 1 },
            limit: { type: 'number', default: 20 },
            siteId: { type: 'string', format: 'uuid' },
            status: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      return reply.status(501).send({
        statusCode: 501,
        error: 'Not Implemented',
        message: 'Assets list not yet implemented',
      });
    }
  );

  // GET /api/v1/assets/:id
  server.get(
    '/:id',
    {
      schema: {
        description: 'Get asset by ID',
        tags: ['assets'],
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
        message: 'Asset detail not yet implemented',
      });
    }
  );
};

export default assetRoutes;
