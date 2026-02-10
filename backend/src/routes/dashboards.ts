import { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { createDashboardService } from "../services/dashboard.service";
import { createKPICalculationService } from "../services/kpi-calculation.service";
import { createReportBuilderService } from "../services/report-builder.service";
import { authorize } from "../middleware/authorize";

export async function dashboardRoutes(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  
  // Import CSRF protection
  const { csrfProtection } = await import('../middleware/csrf');
  fastify.setSerializerCompiler(serializerCompiler);

  const kpiService = createKPICalculationService(fastify);
  const reportService = createReportBuilderService(fastify);
  const dashboardService = createDashboardService(
    fastify,
    kpiService,
    reportService,
  );

  // Apply authentication and RBAC to all routes
  fastify.addHook("onRequest", fastify.authenticate);
  fastify.addHook("onRequest", authorize({ permissions: ["read:dashboards"] }));

  interface UserPayload {
    id: string;
    tenantId: string;
    email: string;
    role: string;
  }

  // List dashboards
  fastify.get("/", async (request) => {
    const { tenantId } = request.user as UserPayload;
    return dashboardService.list(tenantId);
  });

  // Get dashboard by ID
  fastify.get(
    "/:id",
    {
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { tenantId } = request.user as UserPayload;
      const dashboard = await dashboardService.getById(id, tenantId);

      if (!dashboard) {
        return reply.status(404).send({ message: "Dashboard not found" });
      }

      return dashboard;
    },
  );

  // Create dashboard
  fastify.post(
    "/",
    {
      schema: {
        body: z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          layout: z.string().optional(),
          refreshInterval: z.number().optional(),
          widgets: z.array(z.any()).optional(),
          isPublic: z.boolean().optional(),
          isDefault: z.boolean().optional(),
        }),
      },
    },
    async (request) => {
      const { tenantId, id: userId } = request.user as UserPayload;
      const data = request.body as any;
      return dashboardService.create(tenantId, userId, data);
    },
  );

  // Update dashboard
  fastify.put(
    "/:id",
    {
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
        body: z.object({
          name: z.string().min(1).optional(),
          description: z.string().optional(),
          layout: z.string().optional(),
          refreshInterval: z.number().optional(),
          widgets: z.array(z.any()).optional(),
          isPublic: z.boolean().optional(),
          isDefault: z.boolean().optional(),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { tenantId } = request.user as UserPayload;
      const data = request.body as any;

      const dashboard = await dashboardService.update(id, tenantId, data);

      if (!dashboard) {
        return reply.status(404).send({ message: "Dashboard not found" });
      }

      return dashboard;
    },
  );

  // Delete dashboard
  fastify.delete(
    "/:id",
    {
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { tenantId } = request.user as UserPayload;

      await dashboardService.delete(id, tenantId);
      return reply.status(204).send();
    },
  );

  // Render dashboard (get with data)
  fastify.get(
    "/:id/render",
    {
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
        querystring: z
          .object({
            siteId: z.string().optional(),
            startDate: z.string().optional(),
            endDate: z.string().optional(),
          })
          .optional(),
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { tenantId } = request.user as UserPayload;
      const query = request.query as any;

      const filters: any = {};
      if (query?.siteId) filters.siteId = query.siteId;
      if (query?.startDate) filters.startDate = new Date(query.startDate);
      if (query?.endDate) filters.endDate = new Date(query.endDate);

      try {
        const dashboard = await dashboardService.render(id, tenantId, filters);
        return dashboard;
      } catch (error) {
        if ((error as Error).message === "Dashboard not found") {
          return reply.status(404).send({ message: "Dashboard not found" });
        }
        throw error;
      }
    },
  );
}
