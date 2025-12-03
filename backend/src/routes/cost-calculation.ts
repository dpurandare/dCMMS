import { FastifyPluginAsync } from 'fastify';
import { CostCalculationService } from '../services/cost-calculation.service';
import {
  CreateCostRecordRequest,
  UpdateCostRecordRequest,
  CreateLaborRateRequest,
  CreateEquipmentRateRequest,
  CostCalculationInput,
} from '../models/cost.models';

const costCalculationRoutes: FastifyPluginAsync = async (server) => {
  const costService = new CostCalculationService();

  // POST /api/v1/work-orders/:id/costs
  server.post(
    '/:id/costs',
    {
      schema: {
        summary: 'Add a cost record to a work order',
        tags: ['Cost Management'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['category', 'description', 'amount', 'createdBy'],
          properties: {
            category: { type: 'string', enum: ['labor', 'parts', 'equipment', 'other'] },
            description: { type: 'string' },
            amount: { type: 'number' },
            currency: { type: 'string', default: 'USD' },
            laborHours: { type: 'number' },
            technicianId: { type: 'string' },
            partId: { type: 'string' },
            partQuantity: { type: 'number' },
            equipmentType: { type: 'string' },
            equipmentHours: { type: 'number' },
            createdBy: { type: 'string' },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const { id: workOrderId } = request.params as { id: string };
        const body = request.body as any;

        const reqData: CreateCostRecordRequest = {
          workOrderId,
          ...body,
        };

        const costRecord = await costService.addCostRecord(reqData);

        return {
          message: 'Cost record added successfully',
          costRecord,
        };
      } catch (error: any) {
        request.log.error(error);

        if (error.message.includes('negative')) {
          return reply.status(400).send({ error: error.message });
        }

        return reply.status(500).send({
          error: 'Failed to add cost record',
          details: error.message,
        });
      }
    }
  );

  // GET /api/v1/work-orders/:id/costs
  server.get(
    '/:id/costs',
    {
      schema: {
        summary: 'Get all cost records for a work order',
        tags: ['Cost Management'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const { id: workOrderId } = request.params as { id: string };

        const costs = await costService.getCostRecords(workOrderId);

        return {
          workOrderId,
          count: costs.length,
          costs,
        };
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          error: 'Failed to get cost records',
          details: error.message,
        });
      }
    }
  );

  // PATCH /api/v1/work-orders/:workOrderId/costs/:costId
  server.patch(
    '/:workOrderId/costs/:costId',
    {
      schema: {
        summary: 'Update a cost record (manual entries only)',
        tags: ['Cost Management'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            workOrderId: { type: 'string' },
            costId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['updatedBy'],
          properties: {
            description: { type: 'string' },
            amount: { type: 'number' },
            updatedBy: { type: 'string' },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const { costId } = request.params as { costId: string };
        const reqData: UpdateCostRecordRequest = request.body as any;

        const costRecord = await costService.updateCostRecord(costId, reqData);

        return {
          message: 'Cost record updated successfully',
          costRecord,
        };
      } catch (error: any) {
        request.log.error(error);

        if (error.message.includes('not found')) {
          return reply.status(404).send({ error: error.message });
        }

        if (error.message.includes('auto-calculated') || error.message.includes('negative')) {
          return reply.status(400).send({ error: error.message });
        }

        return reply.status(500).send({
          error: 'Failed to update cost record',
          details: error.message,
        });
      }
    }
  );

  // DELETE /api/v1/work-orders/:workOrderId/costs/:costId
  server.delete(
    '/:workOrderId/costs/:costId',
    {
      schema: {
        summary: 'Delete a cost record (manual entries only)',
        tags: ['Cost Management'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            workOrderId: { type: 'string' },
            costId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['deletedBy'],
          properties: {
            deletedBy: { type: 'string' },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const { costId } = request.params as { costId: string };
        const { deletedBy } = request.body as any;

        if (!deletedBy) {
          return reply.status(400).send({ error: 'deletedBy is required' });
        }

        await costService.deleteCostRecord(costId, deletedBy);

        return {
          message: 'Cost record deleted successfully',
        };
      } catch (error: any) {
        request.log.error(error);

        if (error.message.includes('not found')) {
          return reply.status(404).send({ error: error.message });
        }

        if (error.message.includes('auto-calculated')) {
          return reply.status(400).send({ error: error.message });
        }

        return reply.status(500).send({
          error: 'Failed to delete cost record',
          details: error.message,
        });
      }
    }
  );

  // POST /api/v1/work-orders/:id/costs/auto-calculate
  server.post(
    '/:id/costs/auto-calculate',
    {
      schema: {
        summary: 'Auto-calculate costs (labor, parts, equipment)',
        tags: ['Cost Management'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['calculatedBy'],
          properties: {
            laborRecords: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  hours: { type: 'number' },
                  technicianRole: { type: 'string' },
                  isOvertime: { type: 'boolean' },
                },
              },
            },
            partsConsumed: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  partId: { type: 'string' },
                  quantity: { type: 'number' },
                  unitPrice: { type: 'number' },
                },
              },
            },
            equipmentUsage: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  equipmentType: { type: 'string' },
                  hours: { type: 'number' },
                },
              },
            },
            calculatedBy: { type: 'string' },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const { id: workOrderId } = request.params as { id: string };
        const body = request.body as any;
        const { calculatedBy, ...input } = body;

        if (!calculatedBy) {
          return reply.status(400).send({ error: 'calculatedBy is required' });
        }

        const result = await costService.autoCalculateCosts(
          workOrderId,
          input as CostCalculationInput,
          calculatedBy
        );

        return {
          message: 'Costs auto-calculated successfully',
          ...result,
        };
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          error: 'Failed to auto-calculate costs',
          details: error.message,
        });
      }
    }
  );

  // GET /api/v1/work-orders/:id/cost-summary
  server.get(
    '/:id/cost-summary',
    {
      schema: {
        summary: 'Get cost summary (breakdown by category)',
        tags: ['Cost Management'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const { id: workOrderId } = request.params as { id: string };

        const summary = await costService.getCostSummary(workOrderId);

        return summary;
      } catch (error: any) {
        request.log.error(error);

        if (error.message.includes('not found')) {
          return reply.status(404).send({ error: error.message });
        }

        return reply.status(500).send({
          error: 'Failed to get cost summary',
          details: error.message,
        });
      }
    }
  );

  // POST /api/v1/costs/labor-rates
  server.post(
    '/labor-rates',
    {
      schema: {
        summary: 'Create a labor rate',
        tags: ['Cost Management'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['role', 'hourlyRate', 'createdBy'],
          properties: {
            role: { type: 'string' },
            hourlyRate: { type: 'number' },
            overtimeMultiplier: { type: 'number', default: 1.5 },
            currency: { type: 'string', default: 'USD' },
            createdBy: { type: 'string' },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const reqData: CreateLaborRateRequest = request.body as any;

        const laborRate = await costService.createLaborRate(reqData);

        return {
          message: 'Labor rate created successfully',
          laborRate,
        };
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          error: 'Failed to create labor rate',
          details: error.message,
        });
      }
    }
  );

  // GET /api/v1/costs/labor-rates
  server.get(
    '/labor-rates',
    {
      schema: {
        summary: 'Get all labor rates',
        tags: ['Cost Management'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            includeExpired: { type: 'boolean', default: false },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const { includeExpired } = request.query as any;

        const rates = await costService.getLaborRates(includeExpired === true || includeExpired === 'true');

        return {
          count: rates.length,
          rates,
        };
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          error: 'Failed to get labor rates',
          details: error.message,
        });
      }
    }
  );

  // PUT /api/v1/costs/labor-rates/:role
  server.put(
    '/labor-rates/:role',
    {
      schema: {
        summary: 'Update labor rate (creates new version)',
        tags: ['Cost Management'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            role: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['hourlyRate', 'updatedBy'],
          properties: {
            hourlyRate: { type: 'number' },
            updatedBy: { type: 'string' },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const { role } = request.params as { role: string };
        const { hourlyRate, updatedBy } = request.body as any;

        if (!hourlyRate || !updatedBy) {
          return reply.status(400).send({
            error: 'hourlyRate and updatedBy are required',
          });
        }

        const laborRate = await costService.updateLaborRate(role, hourlyRate, updatedBy);

        return {
          message: 'Labor rate updated successfully',
          laborRate,
        };
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          error: 'Failed to update labor rate',
          details: error.message,
        });
      }
    }
  );

  // POST /api/v1/costs/equipment-rates
  server.post(
    '/equipment-rates',
    {
      schema: {
        summary: 'Create an equipment rate',
        tags: ['Cost Management'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['equipmentType', 'hourlyRate', 'createdBy'],
          properties: {
            equipmentType: { type: 'string' },
            hourlyRate: { type: 'number' },
            currency: { type: 'string', default: 'USD' },
            createdBy: { type: 'string' },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const reqData: CreateEquipmentRateRequest = request.body as any;

        const equipmentRate = await costService.createEquipmentRate(reqData);

        return {
          message: 'Equipment rate created successfully',
          equipmentRate,
        };
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          error: 'Failed to create equipment rate',
          details: error.message,
        });
      }
    }
  );

  // GET /api/v1/costs/equipment-rates
  server.get(
    '/equipment-rates',
    {
      schema: {
        summary: 'Get all equipment rates',
        tags: ['Cost Management'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            includeExpired: { type: 'boolean', default: false },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const { includeExpired } = request.query as any;

        const rates = await costService.getEquipmentRates(includeExpired === true || includeExpired === 'true');

        return {
          count: rates.length,
          rates,
        };
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          error: 'Failed to get equipment rates',
          details: error.message,
        });
      }
    }
  );

  // PUT /api/v1/costs/equipment-rates/:equipmentType
  server.put(
    '/equipment-rates/:equipmentType',
    {
      schema: {
        summary: 'Update equipment rate (creates new version)',
        tags: ['Cost Management'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            equipmentType: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['hourlyRate', 'updatedBy'],
          properties: {
            hourlyRate: { type: 'number' },
            updatedBy: { type: 'string' },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const { equipmentType } = request.params as { equipmentType: string };
        const { hourlyRate, updatedBy } = request.body as any;

        if (!hourlyRate || !updatedBy) {
          return reply.status(400).send({
            error: 'hourlyRate and updatedBy are required',
          });
        }

        const equipmentRate = await costService.updateEquipmentRate(
          equipmentType,
          hourlyRate,
          updatedBy
        );

        return {
          message: 'Equipment rate updated successfully',
          equipmentRate,
        };
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          error: 'Failed to update equipment rate',
          details: error.message,
        });
      }
    }
  );
};

export default costCalculationRoutes;
