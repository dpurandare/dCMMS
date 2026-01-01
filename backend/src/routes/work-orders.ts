import { FastifyInstance } from "fastify";
import {
  ZodTypeProvider,
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { z } from "zod";
import { WorkOrderService } from "../services/work-order.service";
import { workOrderStatusEnum } from "../db/schema";
import { authorize } from "../middleware/authorize";

const WorkOrderStatusSchema = z.enum([
  "draft",
  "open",
  "scheduled",
  "in_progress",
  "on_hold",
  "completed",
  "closed",
  "cancelled",
]);

const WorkOrderTypeSchema = z.enum([
  "preventive",
  "corrective",
  "predictive",
  "inspection",
  "emergency",
]);

const WorkOrderPrioritySchema = z.enum(["critical", "high", "medium", "low"]);

const CreateWorkOrderSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  type: WorkOrderTypeSchema,
  priority: WorkOrderPrioritySchema,
  siteId: z.string().uuid(),
  assetId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
  scheduledStart: z.string().datetime().optional(),
  scheduledEnd: z.string().datetime().optional(),
  estimatedHours: z.number().optional(),
  metadata: z.any().optional(),
});

const UpdateWorkOrderSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  type: WorkOrderTypeSchema.optional(),
  priority: WorkOrderPrioritySchema.optional(),
  status: WorkOrderStatusSchema.optional(),
  assignedTo: z.string().uuid().optional(),
  scheduledStart: z.string().datetime().optional(),
  scheduledEnd: z.string().datetime().optional(),
  estimatedHours: z.number().optional(),
  actualHours: z.number().optional(),
  metadata: z.any().optional(),
});

const TransitionSchema = z.object({
  status: WorkOrderStatusSchema,
});

const CreateTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  taskOrder: z.number().int(),
});

const UpdateTaskSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  isCompleted: z.boolean().optional(),
  notes: z.string().optional(),
});

const AddPartSchema = z.object({
  partId: z.string().uuid(),
  quantityRequired: z.number().int().positive(),
  notes: z.string().optional(),
});

const AddLaborSchema = z.object({
  userId: z.string().uuid(),
  hours: z.number().positive(),
  description: z.string().optional(),
});

export const workOrderRoutes = async (app: FastifyInstance) => {
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  const server = app.withTypeProvider<ZodTypeProvider>();
  const authenticate = (app as any).authenticate;

  server.post(
    "/",
    {
      schema: {
        tags: ["work-orders"],
        body: CreateWorkOrderSchema,
        response: {
          201: z.object({
            id: z.string().uuid(),
            workOrderId: z.string(),
            status: z.string(),
          }),
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize({ permissions: ["create:work-orders"] })],
    },
    async (request, reply) => {
      const user = request.user as any;
      const data = {
        ...request.body,
        tenantId: user.tenantId,
        createdBy: user.id,
        scheduledStart: request.body.scheduledStart
          ? new Date(request.body.scheduledStart)
          : undefined,
        scheduledEnd: request.body.scheduledEnd
          ? new Date(request.body.scheduledEnd)
          : undefined,
      };

      const workOrder = await WorkOrderService.create(data);
      return reply.status(201).send(workOrder);
    },
  );

  server.get(
    "/",
    {
      schema: {
        tags: ["work-orders"],
        querystring: z.object({
          page: z.coerce.number().default(1),
          limit: z.coerce.number().default(10),
          status: z.string().optional(),
          priority: z.string().optional(),
          type: z.string().optional(),
          siteId: z.string().uuid().optional(),
          assignedTo: z.string().uuid().optional(),
          assetId: z.string().uuid().optional(),
          search: z.string().optional(),
          sortBy: z.string().optional(),
          sortOrder: z.enum(["asc", "desc"]).optional(),
        }),
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize({ permissions: ["read:work-orders"] })],
    },
    async (request) => {
      const user = request.user as any;
      const { page, limit, sortBy, sortOrder, ...filters } = request.query;

      return WorkOrderService.list(user.tenantId, filters, {
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
        tags: ["work-orders"],
        params: z.object({
          id: z.string().uuid(),
        }),
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize({ permissions: ["read:work-orders"] })],
    },
    async (request) => {
      const user = request.user as any;
      const { id } = request.params;
      return WorkOrderService.getById(id, user.tenantId);
    },
  );

  server.patch(
    "/:id",
    {
      schema: {
        tags: ["work-orders"],
        params: z.object({
          id: z.string().uuid(),
        }),
        body: UpdateWorkOrderSchema,
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize({ permissions: ["update:work-orders"] })],
    },
    async (request) => {
      const user = request.user as any;
      const { id } = request.params;
      const data = {
        ...request.body,
        scheduledStart: request.body.scheduledStart
          ? new Date(request.body.scheduledStart)
          : undefined,
        scheduledEnd: request.body.scheduledEnd
          ? new Date(request.body.scheduledEnd)
          : undefined,
      };
      return WorkOrderService.update(id, user.tenantId, data);
    },
  );

  server.post(
    "/:id/transition",
    {
      schema: {
        tags: ["work-orders"],
        params: z.object({ id: z.string().uuid() }),
        body: TransitionSchema,
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize({ anyPermissions: ["update:work-orders", "close:work-orders"] })],
    },
    async (request) => {
      const user = request.user as any;
      const { id } = request.params;
      const { status } = request.body;
      return WorkOrderService.transitionStatus(id, user.tenantId, status);
    },
  );

  // Tasks
  server.post(
    "/:id/tasks",
    {
      schema: {
        tags: ["work-orders"],
        params: z.object({ id: z.string().uuid() }),
        body: CreateTaskSchema,
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize({ permissions: ["update:work-orders"] })],
    },
    async (request) => {
      const user = request.user as any;
      const { id } = request.params;
      return WorkOrderService.addTask(id, user.tenantId, request.body);
    },
  );

  server.patch(
    "/:id/tasks/:taskId",
    {
      schema: {
        tags: ["work-orders"],
        params: z.object({ id: z.string().uuid(), taskId: z.string().uuid() }),
        body: UpdateTaskSchema,
        security: [{ bearerAuth: [] }],
      },
      preHandler: authenticate,
    },
    async (request) => {
      const user = request.user as any;
      const { taskId } = request.params;
      // Note: updateTask checks tenant via WO association
      return WorkOrderService.updateTask(taskId, user.tenantId, request.body);
    },
  );

  server.delete(
    "/:id/tasks/:taskId",
    {
      schema: {
        tags: ["work-orders"],
        params: z.object({ id: z.string().uuid(), taskId: z.string().uuid() }),
        security: [{ bearerAuth: [] }],
      },
      preHandler: authenticate,
    },
    async (request) => {
      const user = request.user as any;
      const { taskId } = request.params;
      await WorkOrderService.deleteTask(taskId, user.tenantId);
      return { success: true };
    },
  );

  // Parts
  server.post(
    "/:id/parts",
    {
      schema: {
        tags: ["work-orders"],
        params: z.object({ id: z.string().uuid() }),
        body: AddPartSchema,
        security: [{ bearerAuth: [] }],
      },
      preHandler: authenticate,
    },
    async (request) => {
      const user = request.user as any;
      const { id } = request.params;
      return WorkOrderService.addPart(id, user.tenantId, request.body);
    },
  );

  server.delete(
    "/:id/parts/:partId",
    {
      schema: {
        tags: ["work-orders"],
        params: z.object({ id: z.string().uuid(), partId: z.string().uuid() }),
        security: [{ bearerAuth: [] }],
      },
      preHandler: authenticate,
    },
    async (request) => {
      const user = request.user as any;
      const { partId } = request.params;
      await WorkOrderService.removePart(partId, user.tenantId);
      return { success: true };
    },
  );

  // Labor
  server.post(
    "/:id/labor",
    {
      schema: {
        tags: ["work-orders"],
        params: z.object({ id: z.string().uuid() }),
        body: AddLaborSchema,
        security: [{ bearerAuth: [] }],
      },
      preHandler: authenticate,
    },
    async (request) => {
      const user = request.user as any;
      const { id } = request.params;
      return WorkOrderService.addLabor(id, user.tenantId, request.body);
    },
  );

  server.delete(
    "/:id",
    {
      schema: {
        tags: ["work-orders"],
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
      await WorkOrderService.delete(id, user.tenantId);
      return { success: true };
    },
  );
};
export default workOrderRoutes;
