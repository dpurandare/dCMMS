import { FastifyPluginAsync } from 'fastify';
import { WorkOrderService } from '../services/work-order.service';

const workOrderRoutes: FastifyPluginAsync = async (server) => {
  // GET /api/v1/work-orders
  server.get(
    '/',
    {
      schema: {
        description: 'List work orders with pagination and filters',
        tags: ['work-orders'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', default: 1 },
            limit: { type: 'number', default: 20 },
            status: { type: 'string' },
            priority: { type: 'string' },
            type: { type: 'string' },
            assignedTo: { type: 'string' },
            siteId: { type: 'string' },
            assetId: { type: 'string' },
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
        priority: query.priority,
        type: query.type,
        assignedTo: query.assignedTo,
        siteId: query.siteId,
        assetId: query.assetId,
        search: query.search,
      };

      const pagination = {
        page: query.page || 1,
        limit: Math.min(query.limit || 20, 100), // Max 100 items per page
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      };

      const result = await WorkOrderService.list(user.tenantId, filters, pagination);
      return result;
    }
  );

  // GET /api/v1/work-orders/:id
  server.get(
    '/:id',
    {
      schema: {
        description: 'Get work order by ID',
        tags: ['work-orders'],
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
              workOrderId: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              type: { type: 'string' },
              priority: { type: 'string' },
              status: { type: 'string' },
              tasks: { type: 'array' },
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

      const workOrder = await WorkOrderService.getById(id, user.tenantId);

      if (!workOrder) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Work order not found',
        });
      }

      return workOrder;
    }
  );

  // POST /api/v1/work-orders
  server.post(
    '/',
    {
      schema: {
        description: 'Create a new work order',
        tags: ['work-orders'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['title', 'type', 'priority', 'siteId'],
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string' },
            type: { type: 'string', enum: ['corrective', 'preventive', 'predictive', 'inspection', 'emergency'] },
            priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
            status: { type: 'string', enum: ['draft', 'open'] },
            siteId: { type: 'string', format: 'uuid' },
            assetId: { type: 'string', format: 'uuid' },
            assignedTo: { type: 'string', format: 'uuid' },
            scheduledStartDate: { type: 'string', format: 'date-time' },
            scheduledEndDate: { type: 'string', format: 'date-time' },
            estimatedHours: { type: 'number' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              workOrderId: { type: 'string' },
              title: { type: 'string' },
              status: { type: 'string' },
            },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const user = request.user as any;
      const body = request.body as any;

      // Generate work order ID
      const workOrderId = await WorkOrderService.generateWorkOrderId(user.tenantId);

      const workOrder = await WorkOrderService.create({
        tenantId: user.tenantId,
        workOrderId,
        title: body.title,
        description: body.description,
        type: body.type,
        priority: body.priority,
        status: body.status || 'draft',
        siteId: body.siteId,
        assetId: body.assetId,
        assignedTo: body.assignedTo,
        scheduledStartDate: body.scheduledStartDate ? new Date(body.scheduledStartDate) : undefined,
        scheduledEndDate: body.scheduledEndDate ? new Date(body.scheduledEndDate) : undefined,
        estimatedHours: body.estimatedHours,
      });

      return reply.status(201).send(workOrder);
    }
  );

  // PATCH /api/v1/work-orders/:id
  server.patch(
    '/:id',
    {
      schema: {
        description: 'Update work order',
        tags: ['work-orders'],
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
            title: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string' },
            type: { type: 'string', enum: ['corrective', 'preventive', 'predictive', 'inspection', 'emergency'] },
            priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
            status: { type: 'string', enum: ['draft', 'open', 'in_progress', 'on_hold', 'completed', 'cancelled'] },
            assignedTo: { type: 'string', format: 'uuid' },
            scheduledStartDate: { type: 'string', format: 'date-time' },
            scheduledEndDate: { type: 'string', format: 'date-time' },
            actualStartDate: { type: 'string', format: 'date-time' },
            actualEndDate: { type: 'string', format: 'date-time' },
            estimatedHours: { type: 'number' },
            actualHours: { type: 'number' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              workOrderId: { type: 'string' },
              title: { type: 'string' },
              status: { type: 'string' },
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

      const updates: any = {};

      if (body.title !== undefined) updates.title = body.title;
      if (body.description !== undefined) updates.description = body.description;
      if (body.type !== undefined) updates.type = body.type;
      if (body.priority !== undefined) updates.priority = body.priority;
      if (body.status !== undefined) updates.status = body.status;
      if (body.assignedTo !== undefined) updates.assignedTo = body.assignedTo;
      if (body.estimatedHours !== undefined) updates.estimatedHours = body.estimatedHours;
      if (body.actualHours !== undefined) updates.actualHours = body.actualHours;

      if (body.scheduledStartDate) updates.scheduledStartDate = new Date(body.scheduledStartDate);
      if (body.scheduledEndDate) updates.scheduledEndDate = new Date(body.scheduledEndDate);
      if (body.actualStartDate) updates.actualStartDate = new Date(body.actualStartDate);
      if (body.actualEndDate) updates.actualEndDate = new Date(body.actualEndDate);

      const workOrder = await WorkOrderService.update(id, user.tenantId, updates);

      if (!workOrder) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Work order not found',
        });
      }

      return workOrder;
    }
  );

  // DELETE /api/v1/work-orders/:id
  server.delete(
    '/:id',
    {
      schema: {
        description: 'Delete work order (soft delete)',
        tags: ['work-orders'],
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

      const workOrder = await WorkOrderService.delete(id, user.tenantId);

      if (!workOrder) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Work order not found',
        });
      }

      return {
        message: 'Work order deleted successfully',
      };
    }
  );
};

export default workOrderRoutes;
