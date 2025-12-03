import { FastifyPluginAsync } from "fastify";
import { BudgetManagementService } from "../services/budget-management.service";
import {
  CreateBudgetRequest,
  UpdateBudgetRequest,
  BudgetPeriod,
  BudgetStatus,
  CostCategory,
} from "../models/cost.models";

import { CostCalculationService } from "../services/cost-calculation.service";

const budgetManagementRoutes: FastifyPluginAsync = async (server) => {
  const costService = new CostCalculationService();
  const budgetService = new BudgetManagementService(costService);

  // POST /api/v1/budgets
  server.post(
    "/",
    {
      schema: {
        summary: "Create a budget for a site/period",
        tags: ["Budget Management"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: [
            "siteId",
            "budgetPeriod",
            "periodStart",
            "periodEnd",
            "category",
            "allocatedAmount",
            "createdBy",
          ],
          properties: {
            siteId: { type: "string" },
            budgetPeriod: {
              type: "string",
              enum: ["monthly", "quarterly", "yearly"],
            },
            periodStart: { type: "string", format: "date-time" },
            periodEnd: { type: "string", format: "date-time" },
            category: {
              type: "string",
              enum: ["labor", "parts", "equipment", "other", "all"],
            },
            allocatedAmount: { type: "number" },
            currency: { type: "string", default: "USD" },
            createdBy: { type: "string" },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const body = request.body as any;
        const reqData: CreateBudgetRequest = {
          ...body,
          periodStart: new Date(body.periodStart),
          periodEnd: new Date(body.periodEnd),
        };

        const budget = await budgetService.createBudget(reqData);

        return {
          message: "Budget created successfully",
          budget,
        };
      } catch (error: any) {
        request.log.error(error);

        if (
          error.message.includes("must be") ||
          error.message.includes("Invalid")
        ) {
          return reply.status(400).send({ error: error.message });
        }

        return reply.status(500).send({
          error: "Failed to create budget",
          details: error.message,
        });
      }
    },
  );

  // GET /api/v1/budgets
  server.get(
    "/",
    {
      schema: {
        summary: "Get budgets with filters",
        tags: ["Budget Management"],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          properties: {
            siteId: { type: "string" },
            budgetPeriod: {
              type: "string",
              enum: ["monthly", "quarterly", "yearly"],
            },
            category: {
              type: "string",
              enum: ["labor", "parts", "equipment", "other", "all"],
            },
            status: {
              type: "string",
              enum: ["on_track", "at_risk", "over_budget"],
            },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const { siteId, budgetPeriod, category, status } = request.query as any;

        const budgets = await budgetService.getBudgets({
          siteId: siteId as string,
          budgetPeriod: budgetPeriod as BudgetPeriod,
          category: category as CostCategory | "all",
          status: status as BudgetStatus,
        });

        return {
          count: budgets.length,
          budgets,
        };
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          error: "Failed to get budgets",
          details: error.message,
        });
      }
    },
  );

  // GET /api/v1/budgets/:id
  server.get(
    "/:id",
    {
      schema: {
        summary: "Get a single budget",
        tags: ["Budget Management"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };

        const budget = await budgetService.getBudget(id);

        return budget;
      } catch (error: any) {
        request.log.error(error);

        if (error.message.includes("not found")) {
          return reply.status(404).send({ error: error.message });
        }

        return reply.status(500).send({
          error: "Failed to get budget",
          details: error.message,
        });
      }
    },
  );

  // PATCH /api/v1/budgets/:id
  server.patch(
    "/:id",
    {
      schema: {
        summary: "Update budget allocated amount",
        tags: ["Budget Management"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["updatedBy"],
          properties: {
            allocatedAmount: { type: "number" },
            updatedBy: { type: "string" },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const reqData: UpdateBudgetRequest = request.body as any;

        const budget = await budgetService.updateBudget(id, reqData);

        return {
          message: "Budget updated successfully",
          budget,
        };
      } catch (error: any) {
        request.log.error(error);

        if (error.message.includes("not found")) {
          return reply.status(404).send({ error: error.message });
        }

        if (error.message.includes("must be")) {
          return reply.status(400).send({ error: error.message });
        }

        return reply.status(500).send({
          error: "Failed to update budget",
          details: error.message,
        });
      }
    },
  );

  // DELETE /api/v1/budgets/:id
  server.delete(
    "/:id",
    {
      schema: {
        summary: "Delete a budget",
        tags: ["Budget Management"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["deletedBy"],
          properties: {
            deletedBy: { type: "string" },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { deletedBy } = request.body as any;

        if (!deletedBy) {
          return reply.status(400).send({ error: "deletedBy is required" });
        }

        await budgetService.deleteBudget(id, deletedBy);

        return {
          message: "Budget deleted successfully",
        };
      } catch (error: any) {
        request.log.error(error);

        if (error.message.includes("not found")) {
          return reply.status(404).send({ error: error.message });
        }

        return reply.status(500).send({
          error: "Failed to delete budget",
          details: error.message,
        });
      }
    },
  );

  // GET /api/v1/budgets/:id/spending
  server.get(
    "/:id/spending",
    {
      schema: {
        summary: "Get current spending vs allocated",
        tags: ["Budget Management"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };

        const spending = await budgetService.getBudgetSpending(id);

        return spending;
      } catch (error: any) {
        request.log.error(error);

        if (error.message.includes("not found")) {
          return reply.status(404).send({ error: error.message });
        }

        return reply.status(500).send({
          error: "Failed to get budget spending",
          details: error.message,
        });
      }
    },
  );

  // GET /api/v1/budgets/:id/forecast
  server.get(
    "/:id/forecast",
    {
      schema: {
        summary: "Predict end-of-period spending (linear extrapolation)",
        tags: ["Budget Management"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };

        const forecast = await budgetService.forecastBudgetSpending(id);

        return forecast;
      } catch (error: any) {
        request.log.error(error);

        if (error.message.includes("not found")) {
          return reply.status(404).send({ error: error.message });
        }

        return reply.status(500).send({
          error: "Failed to get budget forecast",
          details: error.message,
        });
      }
    },
  );

  // GET /api/v1/budgets/alerts
  server.get(
    "/alerts",
    {
      schema: {
        summary: "Get active budget alerts (>80% spent)",
        tags: ["Budget Management"],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          properties: {
            budgetId: { type: "string" },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const { budgetId } = request.query as any;

        const alerts = await budgetService.getBudgetAlerts(budgetId as string);

        return {
          count: alerts.length,
          alerts,
        };
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          error: "Failed to get budget alerts",
          details: error.message,
        });
      }
    },
  );

  // POST /api/v1/budgets/alerts/:alertId/acknowledge
  server.post(
    "/alerts/:alertId/acknowledge",
    {
      schema: {
        summary: "Acknowledge a budget alert",
        tags: ["Budget Management"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            alertId: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["acknowledgedBy"],
          properties: {
            acknowledgedBy: { type: "string" },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const { alertId } = request.params as { alertId: string };
        const { acknowledgedBy } = request.body as any;

        if (!acknowledgedBy) {
          return reply
            .status(400)
            .send({ error: "acknowledgedBy is required" });
        }

        const alert = await budgetService.acknowledgeBudgetAlert(
          alertId,
          acknowledgedBy,
        );

        return {
          message: "Budget alert acknowledged successfully",
          alert,
        };
      } catch (error: any) {
        request.log.error(error);

        if (error.message.includes("not found")) {
          return reply.status(404).send({ error: error.message });
        }

        return reply.status(500).send({
          error: "Failed to acknowledge budget alert",
          details: error.message,
        });
      }
    },
  );
};

export default budgetManagementRoutes;
