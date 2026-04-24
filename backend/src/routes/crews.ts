import { FastifyInstance } from "fastify";
import {
  ZodTypeProvider,
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { z } from "zod";
import { authorize } from "../middleware/authorize";
import { CrewService } from "../services/crew.service";

const CreateCrewSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  siteId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
  metadata: z.any().optional(),
});

const UpdateCrewSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  siteId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
  metadata: z.any().optional(),
});

const AddMemberSchema = z.object({
  userId: z.string().uuid(),
  isLeader: z.boolean().optional().default(false),
});

const SetRoleSchema = z.object({
  isLeader: z.boolean(),
});

export const crewRoutes = async (app: FastifyInstance) => {
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  const server = app.withTypeProvider<ZodTypeProvider>();
  const authenticate = (app as any).authenticate;

  // Since we might need csrf Protection later, we will import it if available
  let csrfProtection: any;
  try {
    const csrf = await import("../middleware/csrf");
    csrfProtection = csrf.csrfProtection;
  } catch (e) {
    // mock if missing
    csrfProtection = async () => {};
  }

  server.post(
    "/",
    {
      schema: {
        tags: ["crews"],
        body: CreateCrewSchema,
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize({ permissions: ["create:users"] })], // Reusing a similar level permission since create:crews doesn't implicitly exist in spec but admins do this
    },
    async (request, reply) => {
      const user = request.user as any;
      const data = {
        tenantId: user.tenantId,
        name: request.body.name,
        description: request.body.description,
        siteId: request.body.siteId,
        isActive: request.body.isActive,
        metadata: request.body.metadata,
      };

      const crew = await CrewService.create(data);
      return reply.status(201).send(crew);
    },
  );

  server.get(
    "/",
    {
      schema: {
        tags: ["crews"],
        querystring: z.object({
          page: z.coerce.number().default(1),
          limit: z.coerce.number().default(10),
          search: z.string().optional(),
          siteId: z.string().uuid().optional(),
        }),
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize({ permissions: ["read:users"] })],
    },
    async (request) => {
      const user = request.user as any;
      const { page, limit, search, siteId } = request.query;

      return CrewService.list(user.tenantId, {
        page,
        limit,
        search,
        siteId,
      });
    },
  );

  server.get(
    "/:id",
    {
      schema: {
        tags: ["crews"],
        params: z.object({
          id: z.string().uuid(),
        }),
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize({ permissions: ["read:users"] })],
    },
    async (request) => {
      const user = request.user as any;
      const { id } = request.params;
      return CrewService.getById(id, user.tenantId);
    },
  );

  server.patch(
    "/:id",
    {
      schema: {
        tags: ["crews"],
        params: z.object({
          id: z.string().uuid(),
        }),
        body: UpdateCrewSchema,
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize({ permissions: ["update:users"] })],
    },
    async (request) => {
      const user = request.user as any;
      const { id } = request.params;
      return CrewService.update(id, user.tenantId, request.body);
    },
  );

  server.delete(
    "/:id",
    {
      schema: {
        tags: ["crews"],
        params: z.object({
          id: z.string().uuid(),
        }),
        security: [{ bearerAuth: [] }],
        response: {
          200: z.object({ success: z.boolean() }),
        },
      },
      preHandler: [authenticate, authorize({ permissions: ["delete:users"] })],
    },
    async (request) => {
      const user = request.user as any;
      const { id } = request.params;
      await CrewService.delete(id, user.tenantId);
      return { success: true };
    },
  );

  // ==========================================
  // CREW MEMBERS
  // ==========================================

  server.post(
    "/:id/members",
    {
      schema: {
        tags: ["crews"],
        params: z.object({ id: z.string().uuid() }),
        body: AddMemberSchema,
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize({ permissions: ["update:users"] })],
    },
    async (request) => {
      const user = request.user as any;
      const { id } = request.params;
      const { userId, isLeader } = request.body;
      return CrewService.addMember(id, user.tenantId, userId, isLeader);
    },
  );

  server.patch(
    "/:id/members/:userId",
    {
      schema: {
        tags: ["crews"],
        params: z.object({ id: z.string().uuid(), userId: z.string().uuid() }),
        body: SetRoleSchema,
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize({ permissions: ["update:users"] })],
    },
    async (request) => {
      const user = request.user as any;
      const { id, userId } = request.params;
      return CrewService.setMemberRole(id, user.tenantId, userId, request.body.isLeader);
    },
  );

  server.delete(
    "/:id/members/:userId",
    {
      schema: {
        tags: ["crews"],
        params: z.object({ id: z.string().uuid(), userId: z.string().uuid() }),
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize({ permissions: ["update:users"] })],
    },
    async (request) => {
      const user = request.user as any;
      const { id, userId } = request.params;
      await CrewService.removeMember(id, user.tenantId, userId);
      return { success: true };
    },
  );
};
export default crewRoutes;
