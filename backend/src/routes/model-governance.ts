import { FastifyPluginAsync } from "fastify";
import {
  ModelGovernanceService,
  ModelDocumentation,
  ModelStage,
} from "../services/model-governance.service";

const modelGovernanceRoutes: FastifyPluginAsync = async (server) => {
  // Import CSRF protection
  const { csrfProtection } = await import('../middleware/csrf');
  
  const governanceService = new ModelGovernanceService();

  // POST /api/v1/model-governance/register
  server.post(
    "/register",
    {
      schema: {
        summary: "Register a new model",
        tags: ["Model Governance"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["modelName", "version", "description", "owner"],
          properties: {
            modelName: { type: "string", example: "predictive_maintenance" },
            version: { type: "string", example: "v2.0.0" },
            description: { type: "string" },
            owner: { type: "string" },
          },
        },
      },
      preHandler: [server.authenticate, csrfProtection],
    },
    async (request, reply) => {
      try {
        const { modelName, version, description, owner } = request.body as any;

        const registration = await governanceService.registerModel(
          modelName,
          version,
          description,
          owner,
        );

        return {
          message: "Model registered successfully",
          registration,
        };
      } catch (error: any) {
        request.log.error(error);

        if (error.message.includes("already registered")) {
          return reply.status(400).send({ error: error.message });
        }

        return reply.status(500).send({
          error: "Failed to register model",
          details: error.message,
        });
      }
    },
  );

  // PUT /api/v1/model-governance/:modelId/stage
  server.put(
    "/:modelId/stage",
    {
      schema: {
        summary: "Update model stage",
        tags: ["Model Governance"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            modelId: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["newStage", "updatedBy"],
          properties: {
            newStage: {
              type: "string",
              enum: [
                "development",
                "staging",
                "review",
                "production",
                "retired",
              ],
            },
            updatedBy: { type: "string" },
          },
        },
      },
      preHandler: [server.authenticate, csrfProtection],
    },
    async (request, reply) => {
      try {
        const { modelId } = request.params as { modelId: string };
        const { newStage, updatedBy } = request.body as any;

        const model = await governanceService.updateModelStage(
          modelId,
          newStage as ModelStage,
          updatedBy,
        );

        return {
          message: "Model stage updated successfully",
          model,
        };
      } catch (error: any) {
        request.log.error(error);

        if (error.message.includes("not found")) {
          return reply.status(404).send({ error: error.message });
        }

        if (error.message.includes("Invalid")) {
          return reply.status(400).send({ error: error.message });
        }

        return reply.status(500).send({
          error: "Failed to update model stage",
          details: error.message,
        });
      }
    },
  );

  // POST /api/v1/model-governance/:modelId/approval/request
  server.post(
    "/:modelId/approval/request",
    {
      schema: {
        summary: "Request approval for model promotion",
        tags: ["Model Governance"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            modelId: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["requestedBy", "approvers"],
          properties: {
            requestedBy: { type: "string" },
            approvers: { type: "array", items: { type: "string" } },
          },
        },
      },
      preHandler: [server.authenticate, csrfProtection],
    },
    async (request, reply) => {
      try {
        const { modelId } = request.params as { modelId: string };
        const { requestedBy, approvers } = request.body as any;

        const approval = await governanceService.requestApproval(
          modelId,
          requestedBy,
          approvers,
        );

        return {
          message: "Approval request created successfully",
          approval,
        };
      } catch (error: any) {
        request.log.error(error);

        if (error.message.includes("not found")) {
          return reply.status(404).send({ error: error.message });
        }

        if (error.message.includes("stage")) {
          return reply.status(400).send({ error: error.message });
        }

        return reply.status(500).send({
          error: "Failed to request approval",
          details: error.message,
        });
      }
    },
  );

  // POST /api/v1/model-governance/:modelId/approval/approve
  server.post(
    "/:modelId/approval/approve",
    {
      schema: {
        summary: "Approve model for production",
        tags: ["Model Governance"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            modelId: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["approvedBy"],
          properties: {
            approvedBy: { type: "string" },
          },
        },
      },
      preHandler: [server.authenticate, csrfProtection],
    },
    async (request, reply) => {
      try {
        const { modelId } = request.params as { modelId: string };
        const { approvedBy } = request.body as any;

        const approval = await governanceService.approveModel(
          modelId,
          approvedBy,
        );

        return {
          message: "Model approved successfully",
          approval,
        };
      } catch (error: any) {
        request.log.error(error);

        if (error.message.includes("not found")) {
          return reply.status(404).send({ error: error.message });
        }

        if (
          error.message.includes("approver") ||
          error.message.includes("checklist")
        ) {
          return reply.status(400).send({ error: error.message });
        }

        return reply.status(500).send({
          error: "Failed to approve model",
          details: error.message,
        });
      }
    },
  );

  // POST /api/v1/model-governance/:modelId/approval/reject
  server.post(
    "/:modelId/approval/reject",
    {
      schema: {
        summary: "Reject model approval",
        tags: ["Model Governance"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            modelId: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["rejectedBy", "reason"],
          properties: {
            rejectedBy: { type: "string" },
            reason: { type: "string" },
          },
        },
      },
      preHandler: [server.authenticate, csrfProtection],
    },
    async (request, reply) => {
      try {
        const { modelId } = request.params as { modelId: string };
        const { rejectedBy, reason } = request.body as any;

        const approval = await governanceService.rejectModel(
          modelId,
          rejectedBy,
          reason,
        );

        return {
          message: "Model rejected",
          approval,
        };
      } catch (error: any) {
        request.log.error(error);

        if (error.message.includes("not found")) {
          return reply.status(404).send({ error: error.message });
        }

        return reply.status(500).send({
          error: "Failed to reject model",
          details: error.message,
        });
      }
    },
  );

  // PUT /api/v1/model-governance/:modelId/checklist/:itemId
  server.put(
    "/:modelId/checklist/:itemId",
    {
      schema: {
        summary: "Update checklist item",
        tags: ["Model Governance"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            modelId: { type: "string" },
            itemId: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["completed", "completedBy"],
          properties: {
            completed: { type: "boolean" },
            completedBy: { type: "string" },
            evidence: { type: "string" },
            notes: { type: "string" },
          },
        },
      },
      preHandler: [server.authenticate, csrfProtection],
    },
    async (request, reply) => {
      try {
        const { modelId, itemId } = request.params as {
          modelId: string;
          itemId: string;
        };
        const { completed, completedBy, evidence, notes } = request.body as any;

        const approval = await governanceService.updateChecklistItem(
          modelId,
          itemId,
          completed,
          completedBy,
          evidence,
          notes,
        );

        return {
          message: "Checklist item updated",
          approval,
        };
      } catch (error: any) {
        request.log.error(error);

        if (error.message.includes("not found")) {
          return reply.status(404).send({ error: error.message });
        }

        return reply.status(500).send({
          error: "Failed to update checklist item",
          details: error.message,
        });
      }
    },
  );

  // POST /api/v1/model-governance/:modelId/documentation
  server.post(
    "/:modelId/documentation",
    {
      schema: {
        summary: "Add model documentation",
        tags: ["Model Governance"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            modelId: { type: "string" },
          },
        },
        body: {
          type: "object",
        },
      },
      preHandler: [server.authenticate, csrfProtection],
    },
    async (request, reply) => {
      try {
        const { modelId } = request.params as { modelId: string };
        const doc: ModelDocumentation = {
          modelId,
          ...(request.body as any),
          lastUpdated: new Date(),
        };

        const documentation = await governanceService.addDocumentation(doc);

        return {
          message: "Documentation added successfully",
          documentation,
        };
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          error: "Failed to add documentation",
          details: error.message,
        });
      }
    },
  );

  // GET /api/v1/model-governance/:modelId/documentation
  server.get(
    "/:modelId/documentation",
    {
      schema: {
        summary: "Get model documentation",
        tags: ["Model Governance"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            modelId: { type: "string" },
          },
        },
      },
      preHandler: [server.authenticate, csrfProtection],
    },
    async (request, reply) => {
      try {
        const { modelId } = request.params as { modelId: string };

        const documentation = await governanceService.getDocumentation(modelId);

        return documentation;
      } catch (error: any) {
        request.log.error(error);

        if (error.message.includes("not found")) {
          return reply.status(404).send({ error: error.message });
        }

        return reply.status(500).send({
          error: "Failed to get documentation",
          details: error.message,
        });
      }
    },
  );

  // POST /api/v1/model-governance/:modelId/retire
  server.post(
    "/:modelId/retire",
    {
      schema: {
        summary: "Retire a model",
        tags: ["Model Governance"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            modelId: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["retiredBy", "reason"],
          properties: {
            retiredBy: { type: "string" },
            reason: { type: "string" },
            replacementModelId: { type: "string" },
            dataRetentionPolicy: { type: "string" },
          },
        },
      },
      preHandler: [server.authenticate, csrfProtection],
    },
    async (request, reply) => {
      try {
        const { modelId } = request.params as { modelId: string };
        const { retiredBy, reason, replacementModelId, dataRetentionPolicy } =
          request.body as any;

        const retirement = await governanceService.retireModel(
          modelId,
          retiredBy,
          reason,
          replacementModelId,
          dataRetentionPolicy,
        );

        return {
          message: "Model retired successfully",
          retirement,
        };
      } catch (error: any) {
        request.log.error(error);

        if (error.message.includes("not found")) {
          return reply.status(404).send({ error: error.message });
        }

        return reply.status(500).send({
          error: "Failed to retire model",
          details: error.message,
        });
      }
    },
  );

  // POST /api/v1/model-governance/:modelId/incidents
  server.post(
    "/:modelId/incidents",
    {
      schema: {
        summary: "Report an incident",
        tags: ["Model Governance"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            modelId: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["severity", "type", "description", "impact", "reportedBy"],
          properties: {
            severity: {
              type: "string",
              enum: ["low", "medium", "high", "critical"],
            },
            type: {
              type: "string",
              enum: [
                "prediction_error",
                "performance_degradation",
                "bias",
                "security",
                "compliance",
                "other",
              ],
            },
            description: { type: "string" },
            impact: { type: "string" },
            reportedBy: { type: "string" },
          },
        },
      },
      preHandler: [server.authenticate, csrfProtection],
    },
    async (request, reply) => {
      try {
        const { modelId } = request.params as { modelId: string };
        const { severity, type, description, impact, reportedBy } =
          request.body as any;

        const incident = await governanceService.reportIncident(
          modelId,
          severity,
          type,
          description,
          impact,
          reportedBy,
        );

        return {
          message: "Incident reported successfully",
          incident,
        };
      } catch (error: any) {
        request.log.error(error);

        if (error.message.includes("not found")) {
          return reply.status(404).send({ error: error.message });
        }

        return reply.status(500).send({
          error: "Failed to report incident",
          details: error.message,
        });
      }
    },
  );

  // PUT /api/v1/model-governance/incidents/:incidentId
  server.put(
    "/incidents/:incidentId",
    {
      schema: {
        summary: "Update incident status",
        tags: ["Model Governance"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            incidentId: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["status"],
          properties: {
            status: {
              type: "string",
              enum: ["open", "investigating", "resolved", "closed"],
            },
            resolution: { type: "string" },
            resolvedBy: { type: "string" },
            actionsTaken: { type: "array", items: { type: "string" } },
          },
        },
      },
      preHandler: [server.authenticate, csrfProtection],
    },
    async (request, reply) => {
      try {
        const { incidentId } = request.params as { incidentId: string };
        const { status, resolution, resolvedBy, actionsTaken } =
          request.body as any;

        const incident = await governanceService.updateIncident(
          incidentId,
          status,
          resolution,
          resolvedBy,
          actionsTaken,
        );

        return {
          message: "Incident updated successfully",
          incident,
        };
      } catch (error: any) {
        request.log.error(error);

        if (error.message.includes("not found")) {
          return reply.status(404).send({ error: error.message });
        }

        return reply.status(500).send({
          error: "Failed to update incident",
          details: error.message,
        });
      }
    },
  );

  // GET /api/v1/model-governance/models
  server.get(
    "/models",
    {
      schema: {
        summary: "Get models by stage",
        tags: ["Model Governance"],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          required: ["stage"],
          properties: {
            stage: {
              type: "string",
              enum: [
                "development",
                "staging",
                "review",
                "production",
                "retired",
              ],
            },
          },
        },
      },
      preHandler: [server.authenticate, csrfProtection],
    },
    async (request, reply) => {
      try {
        const { stage } = request.query as any;

        const models = await governanceService.getModelsByStage(
          stage as ModelStage,
        );

        return {
          stage,
          count: models.length,
          models,
        };
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          error: "Failed to get models",
          details: error.message,
        });
      }
    },
  );
};

export default modelGovernanceRoutes;
