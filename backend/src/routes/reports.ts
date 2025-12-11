import { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { createReportService } from "../services/report.service";
import { createReportBuilderService } from "../services/report-builder.service";

export default async function reportRoutes(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  const reportBuilder = createReportBuilderService(fastify);
  const reportService = createReportService(fastify, reportBuilder);

  // Apply authentication to all routes
  fastify.addHook("onRequest", fastify.authenticate);

  interface UserPayload {
    id: string;
    tenantId: string;
    email: string;
    role: string;
  }

  // List reports
  fastify.get("/", async (request) => {
    const { tenantId } = request.user as UserPayload;
    return reportService.list(tenantId);
  });

  // Get report by ID
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
      const report = await reportService.getById(id, tenantId);

      if (!report) {
        return reply.status(404).send({ message: "Report not found" });
      }

      return report;
    },
  );

  // Create report
  fastify.post(
    "/",
    {
      schema: {
        body: z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          datasource: z.string().min(1),
          config: z.any(),
          isPublic: z.boolean().optional(),
        }),
      },
    },
    async (request) => {
      const { tenantId, id: userId } = request.user as UserPayload;
      const data = request.body as any;
      return reportService.create(tenantId, userId, data);
    },
  );

  // Update report
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
          config: z.any().optional(),
          isPublic: z.boolean().optional(),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { tenantId } = request.user as UserPayload;
      const data = request.body as any;

      const report = await reportService.update(id, tenantId, data);

      if (!report) {
        return reply.status(404).send({ message: "Report not found" });
      }

      return report;
    },
  );

  // Delete report
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

      await reportService.delete(id, tenantId);
      return reply.status(204).send();
    },
  );

  // Execute report
  fastify.post(
    "/:id/execute",
    {
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
        body: z
          .object({
            format: z.enum(["json", "csv"]).optional(),
            limit: z.number().optional(),
          })
          .optional(),
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { tenantId } = request.user as UserPayload;
      const options = request.body as any;

      try {
        const result = await reportService.execute(id, tenantId, options);
        return result;
      } catch (error) {
        if ((error as Error).message === "Report not found") {
          return reply.status(404).send({ message: "Report not found" });
        }
        throw error;
      }
    },
  );

  // Get available fields for a datasource
  fastify.get(
    "/fields/:datasource",
    {
      schema: {
        params: z.object({
          datasource: z.enum(["work_orders", "assets", "telemetry", "alarms"]),
        }),
      },
    },
    async (request, reply) => {
      const { datasource } = request.params as {
        datasource: "work_orders" | "assets" | "telemetry" | "alarms";
      };
      return reportBuilder.getAvailableFields(datasource);
    },
  );
}
