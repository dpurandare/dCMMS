import { FastifyPluginAsync } from "fastify";
import {
  WorkOrderApprovalService,
  ApprovalRequest,
  RejectionRequest,
} from "../services/wo-approval.service";

const woApprovalRoutes: FastifyPluginAsync = async (server) => {
  // Import CSRF protection
  const { csrfProtection } = await import('../middleware/csrf');

  const approvalService = new WorkOrderApprovalService();

  // POST /api/v1/work-orders/:id/approve
  server.post(
    "/:id/approve",
    {
      schema: {
        summary: "Approve a predictive work order",
        tags: ["Work Order Approval"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["approvedBy"],
          properties: {
            approvedBy: { type: "string" },
            comments: { type: "string" },
          },
        },
      },
      preHandler: [server.authenticate, csrfProtection],
    },
    async (request, reply) => {
      try {
        const { id: workOrderId } = request.params as { id: string };
        const { approvedBy, comments } = request.body as {
          approvedBy: string;
          comments?: string;
        };

        const approvalRequest: ApprovalRequest = {
          workOrderId,
          approvedBy,
          comments,
        };

        const approval =
          await approvalService.approveWorkOrder(approvalRequest);

        return {
          message: "Work order approved successfully",
          approval,
        };
      } catch (error: any) {
        request.log.error(error);
        if (error.message.includes("not found")) {
          return reply.status(404).send({ error: error.message });
        }
        if (error.message.includes("already")) {
          return reply.status(400).send({ error: error.message });
        }
        return reply.status(500).send({
          error: "Failed to approve work order",
          details: error.message,
        });
      }
    },
  );

  // POST /api/v1/work-orders/:id/reject
  server.post(
    "/:id/reject",
    {
      schema: {
        summary: "Reject a predictive work order with feedback",
        tags: ["Work Order Approval"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["rejectedBy", "reason"],
          properties: {
            rejectedBy: { type: "string" },
            reason: { type: "string" },
            feedback: { type: "string" },
          },
        },
      },
      preHandler: [server.authenticate, csrfProtection],
    },
    async (request, reply) => {
      try {
        const { id: workOrderId } = request.params as { id: string };
        const { rejectedBy, reason, feedback } = request.body as {
          rejectedBy: string;
          reason: string;
          feedback?: string;
        };

        const rejectionRequest: RejectionRequest = {
          workOrderId,
          rejectedBy,
          reason,
          feedback,
        };

        const approval =
          await approvalService.rejectWorkOrder(rejectionRequest);

        return {
          message: "Work order rejected successfully",
          approval,
        };
      } catch (error: any) {
        request.log.error(error);
        if (error.message.includes("not found")) {
          return reply.status(404).send({ error: error.message });
        }
        if (error.message.includes("already")) {
          return reply.status(400).send({ error: error.message });
        }
        return reply.status(500).send({
          error: "Failed to reject work order",
          details: error.message,
        });
      }
    },
  );

  // POST /api/v1/work-orders/batch-approve
  server.post(
    "/batch-approve",
    {
      schema: {
        summary: "Batch approve multiple work orders",
        tags: ["Work Order Approval"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["workOrderIds", "approvedBy"],
          properties: {
            workOrderIds: { type: "array", items: { type: "string" } },
            approvedBy: { type: "string" },
            comments: { type: "string" },
          },
        },
      },
      preHandler: [server.authenticate, csrfProtection],
    },
    async (request, reply) => {
      try {
        const { workOrderIds, approvedBy, comments } = request.body as {
          workOrderIds: string[];
          approvedBy: string;
          comments?: string;
        };

        if (workOrderIds.length === 0) {
          return reply
            .status(400)
            .send({ error: "workOrderIds array cannot be empty" });
        }

        if (workOrderIds.length > 50) {
          return reply.status(400).send({
            error: "Maximum 50 work orders can be approved in a single batch",
          });
        }

        const result = await approvalService.batchApprove(
          workOrderIds,
          approvedBy,
          comments,
        );

        return {
          message: "Batch approval completed",
          ...result,
        };
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          error: "Failed to batch approve work orders",
          details: error.message,
        });
      }
    },
  );

  // GET /api/v1/work-orders/:id/approval-status
  server.get(
    "/:id/approval-status",
    {
      schema: {
        summary: "Get approval status for a work order",
        tags: ["Work Order Approval"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
      },
      preHandler: [server.authenticate, csrfProtection],
    },
    async (request, reply) => {
      try {
        const { id: workOrderId } = request.params as { id: string };
        const status = await approvalService.getApprovalStatus(workOrderId);
        return status;
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          error: "Failed to get approval status",
          details: error.message,
        });
      }
    },
  );

  // GET /api/v1/work-orders/approval-stats
  server.get(
    "/approval-stats",
    {
      schema: {
        summary: "Get approval statistics",
        tags: ["Work Order Approval"],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          properties: {
            startDate: { type: "string", format: "date-time" },
            endDate: { type: "string", format: "date-time" },
          },
        },
      },
      preHandler: [server.authenticate, csrfProtection],
    },
    async (request, reply) => {
      try {
        const { startDate, endDate } = request.query as {
          startDate?: string;
          endDate?: string;
        };
        const start = startDate ? new Date(startDate) : undefined;
        const end = endDate ? new Date(endDate) : undefined;

        const stats = await approvalService.getApprovalStats(start, end);
        return stats;
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          error: "Failed to get approval statistics",
          details: error.message,
        });
      }
    },
  );

  // GET /api/v1/work-orders/rejection-feedback
  server.get(
    "/rejection-feedback",
    {
      schema: {
        summary: "Get rejection feedback for ML team review",
        tags: ["Work Order Approval"],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          properties: {
            limit: { type: "integer", default: 100 },
          },
        },
      },
      preHandler: [server.authenticate, csrfProtection],
    },
    async (request, reply) => {
      try {
        const { limit = 100 } = request.query as { limit?: number };

        if (limit < 1 || limit > 1000) {
          return reply
            .status(400)
            .send({ error: "limit must be between 1 and 1000" });
        }

        const feedback = await approvalService.getRejectionFeedback(limit);

        return {
          count: feedback.length,
          feedback,
        };
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          error: "Failed to get rejection feedback",
          details: error.message,
        });
      }
    },
  );

  // POST /api/v1/work-orders/:id/complete
  server.post(
    "/:id/complete",
    {
      schema: {
        summary: "Record work order completion with ground truth",
        tags: ["Work Order Approval"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["assetId", "failureOccurred"],
          properties: {
            assetId: { type: "string" },
            failureOccurred: { type: "boolean" },
            failureType: { type: "string" },
          },
        },
      },
      preHandler: [server.authenticate, csrfProtection],
    },
    async (request, reply) => {
      try {
        const { id: workOrderId } = request.params as { id: string };
        const { assetId, failureOccurred, failureType } = request.body as {
          assetId: string;
          failureOccurred: boolean;
          failureType?: string;
        };

        await approvalService.recordWorkOrderCompletion(
          workOrderId,
          assetId,
          failureOccurred,
          failureType,
        );

        return {
          message: "Work order completion recorded successfully",
          workOrderId,
          assetId,
          failureOccurred,
        };
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          error: "Failed to record work order completion",
          details: error.message,
        });
      }
    },
  );
};

export default woApprovalRoutes;
