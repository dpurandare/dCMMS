import { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { createReportService } from "../services/report.service";
import {
  createReportBuilderService,
  REPORT_DATASOURCES,
} from "../services/report-builder.service";
import { authorize } from "../middleware/authorize";

export default async function reportRoutes(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  const reportBuilder = createReportBuilderService(fastify);
  const reportService = createReportService(fastify, reportBuilder);

  // Apply authentication and RBAC to all routes
  fastify.addHook("onRequest", fastify.authenticate);
  fastify.addHook("onRequest", authorize({ permissions: ["read:reports"] }));

  // Import CSRF protection
  const { csrfProtection } = await import('../middleware/csrf');

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
          // Was z.string(): any value was stored and only failed later, at execution time, with a 500.
          datasource: z.enum(REPORT_DATASOURCES),
          config: z.any(),
          isPublic: z.boolean().optional(),
        }),
      },
      preHandler: [csrfProtection, authorize({ permissions: ["create:reports"] })],
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
      preHandler: [csrfProtection, authorize({ permissions: ["create:reports"] })],
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
      preHandler: [csrfProtection, authorize({ permissions: ["create:reports"] })],
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
      preHandler: [csrfProtection],
    },
    async (request, reply) => {
      // DISABLED (REV-066). Report execution built SQL for ClickHouse by pasting stored filter
      // fields/values straight into the query -- a confirmed, exploitable SQL injection (proven
      // end to end on 2026-11-17: an injected subquery ran, and the error echoed the generated
      // SQL including the tenant filter). ClickHouse is being retired in favour of
      // PostgreSQL/TimescaleDB, and nothing real depends on this today (ClickHouse is empty, so
      // every run returned []). Rather than patch code that is being replaced, execution is off
      // until the report builder is ported with parameterized SQL.
      // TODO(REV-066): port ReportBuilderService to Postgres/Timescale (parameterized queries,
      // allow-listed columns), then restore reportService.execute(id, tenantId, options) here.
      return reply.status(503).send({
        statusCode: 503,
        error: "Service Unavailable",
        message:
          "Report execution is temporarily disabled while analytics moves to PostgreSQL/TimescaleDB (REV-066).",
      });
    },
  );

  // Get available fields for a datasource
  fastify.get(
    "/fields/:datasource",
    {
      schema: {
        params: z.object({
          datasource: z.enum(REPORT_DATASOURCES),
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
