import { FastifyPluginAsync } from 'fastify';

const workOrderRoutes: FastifyPluginAsync = async (server) => {
  // GET /api/v1/work-orders
  server.get(
    '/',
    {
      schema: {
        description: 'List work orders with pagination and filters',
        tags: ['work-orders'],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', default: 1 },
            limit: { type: 'number', default: 20 },
            status: { type: 'string' },
            priority: { type: 'string' },
            assignedTo: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      // TODO: Implement work orders list
      return reply.status(501).send({
        statusCode: 501,
        error: 'Not Implemented',
        message: 'Work orders list not yet implemented',
      });
    }
  );

  // GET /api/v1/work-orders/:id
  server.get(
    '/:id',
    {
      schema: {
        description: 'Get work order by ID',
        tags: ['work-orders'],
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
        message: 'Work order detail not yet implemented',
      });
    }
  );

  // POST /api/v1/work-orders
  server.post(
    '/',
    {
      schema: {
        description: 'Create a new work order',
        tags: ['work-orders'],
        body: {
          type: 'object',
          required: ['title', 'type', 'priority', 'siteId'],
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            type: { type: 'string', enum: ['corrective', 'preventive', 'predictive', 'inspection', 'emergency'] },
            priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
            siteId: { type: 'string', format: 'uuid' },
            assetId: { type: 'string', format: 'uuid' },
            assignedTo: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request, reply) => {
      return reply.status(501).send({
        statusCode: 501,
        error: 'Not Implemented',
        message: 'Work order creation not yet implemented',
      });
    }
  );

  // PATCH /api/v1/work-orders/:id
  server.patch(
    '/:id',
    {
      schema: {
        description: 'Update work order',
        tags: ['work-orders'],
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
        message: 'Work order update not yet implemented',
      });
    }
  );

  // DELETE /api/v1/work-orders/:id
  server.delete(
    '/:id',
    {
      schema: {
        description: 'Delete work order',
        tags: ['work-orders'],
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
        message: 'Work order deletion not yet implemented',
      });
    }
  );
};

export default workOrderRoutes;
