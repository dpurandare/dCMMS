import { FastifyInstance } from "fastify";
import {
  ZodTypeProvider,
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { z } from "zod";
import { PermitService } from "../services/permit.service";

const CreatePermitSchema = z.object({
  workOrderId: z.string().uuid(),
  type: z.enum(["hot_work", "confined_space", "electrical", "height"]), // Add other types as needed or keep string
  status: z
    .enum(["requested", "active", "expired", "revoked", "completed"])
    .default("requested"),
  issuerId: z.string().uuid().optional(),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime(),
  metadata: z.any().optional(),
});

const UpdatePermitSchema = z.object({
  status: z
    .enum(["requested", "active", "expired", "revoked", "completed"])
    .optional(),
  approverId: z.string().uuid().optional(),
  approvedAt: z.string().datetime().optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  metadata: z.any().optional(),
});

export const permitRoutes = async (app: FastifyInstance) => {
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  const server = app.withTypeProvider<ZodTypeProvider>();
  const authenticate = (app as any).authenticate;

  server.post(
    "/",
    {
      schema: {
        tags: ["permits"],
        body: CreatePermitSchema,
        security: [{ bearerAuth: [] }],
        response: {
          201: z.object({
            id: z.string().uuid(),
            permitId: z.string(),
          }),
        },
      },
      preHandler: authenticate,
    },
    async (request, reply) => {
      const user = request.user as any;
      const data = {
        ...request.body,
        tenantId: user.tenantId,
        validFrom: new Date(request.body.validFrom),
        validUntil: new Date(request.body.validUntil),
        issuerId: request.body.issuerId || user.id, // Default to creator if not sent
      };

      // Auto-generate permitId
      const permitPrefix = `PER-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
      const permitSuffix = Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase();
      const permitId = `${permitPrefix}-${permitSuffix}`;

      const permit = await PermitService.create({ ...data, permitId } as any);
      return reply.status(201).send(permit);
    },
  );

  server.get(
    "/",
    {
      schema: {
        tags: ["permits"],
        querystring: z.object({
          page: z.coerce.number().default(1),
          limit: z.coerce.number().default(10),
          workOrderId: z.string().uuid().optional(),
          type: z.string().optional(),
          status: z.string().optional(),
          search: z.string().optional(),
          sortBy: z.string().optional(),
          sortOrder: z.enum(["asc", "desc"]).optional(),
        }),
        security: [{ bearerAuth: [] }],
      },
      preHandler: authenticate,
    },
    async (request) => {
      const user = request.user as any;
      const { page, limit, sortBy, sortOrder, ...filters } = request.query;

      return PermitService.list(user.tenantId, filters, {
        page,
        limit,
        sortBy,
        sortOrder,
      });
    },
  );

  server.get(
    "/:id",
    {
      schema: {
        tags: ["permits"],
        params: z.object({
          id: z.string().uuid(),
        }),
        security: [{ bearerAuth: [] }],
      },
      preHandler: authenticate,
    },
    async (request) => {
      const user = request.user as any;
      const { id } = request.params;
      return PermitService.getById(id, user.tenantId);
    },
  );

  server.patch(
    "/:id",
    {
      schema: {
        tags: ["permits"],
        params: z.object({
          id: z.string().uuid(),
        }),
        body: UpdatePermitSchema,
        security: [{ bearerAuth: [] }],
      },
      preHandler: authenticate,
    },
    async (request) => {
      const user = request.user as any;
      const { id } = request.params;
      const data = {
        ...request.body,
        approvedAt: request.body.approvedAt
          ? new Date(request.body.approvedAt)
          : undefined,
        validFrom: request.body.validFrom
          ? new Date(request.body.validFrom)
          : undefined,
        validUntil: request.body.validUntil
          ? new Date(request.body.validUntil)
          : undefined,
      };
      return PermitService.update(id, user.tenantId, data);
    },
  );

  server.delete(
    "/:id",
    {
      schema: {
        tags: ["permits"],
        params: z.object({
          id: z.string().uuid(),
        }),
        security: [{ bearerAuth: [] }],
        response: {
          200: z.object({ success: z.boolean() }),
        },
      },
      preHandler: authenticate,
    },
    async (request) => {
      const user = request.user as any;
      const { id } = request.params;
      await PermitService.delete(id, user.tenantId);
      return { success: true };
    },
  );
};

export default permitRoutes;
