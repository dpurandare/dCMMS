import { FastifyPluginAsync } from "fastify";
import { MLDeploymentService } from "../services/ml-deployment.service";

const mlDeploymentRoutes: FastifyPluginAsync = async (server) => {
  const deploymentService = new MLDeploymentService();

  // POST /api/v1/ml-deployment/deploy
  server.post(
    "/deploy",
    {
      schema: {
        summary: "Deploy a model version",
        tags: ["ML Deployment"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["modelName", "version"],
          properties: {
            modelName: { type: "string" },
            version: { type: "string" },
            config: { type: "object" },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const { modelName, version, config } = request.body as {
          modelName: string;
          version: string;
          config?: any;
        };

        const deployment = await deploymentService.deployModel(
          modelName,
          version,
          config,
        );

        return {
          message: "Model deployed successfully",
          deployment,
        };
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          error: error.message || "Failed to deploy model",
        });
      }
    },
  );

  // POST /api/v1/ml-deployment/undeploy
  server.post(
    "/undeploy",
    {
      schema: {
        summary: "Undeploy a model",
        tags: ["ML Deployment"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["modelName"],
          properties: {
            modelName: { type: "string" },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const { modelName } = request.body as { modelName: string };

        const result = await deploymentService.undeployModel(modelName);

        return {
          message: "Model undeployed successfully",
          result,
        };
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          error: error.message || "Failed to undeploy model",
        });
      }
    },
  );

  // POST /api/v1/ml-deployment/rollback
  server.post(
    "/rollback",
    {
      schema: {
        summary: "Rollback to previous version",
        tags: ["ML Deployment"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["modelName"],
          properties: {
            modelName: { type: "string" },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const { modelName } = request.body as { modelName: string };

        const deployment = await deploymentService.rollbackModel(modelName);

        return {
          message: "Model rolled back successfully",
          deployment,
        };
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          error: error.message || "Failed to rollback model",
        });
      }
    },
  );

  // GET /api/v1/ml-deployment
  server.get(
    "/",
    {
      schema: {
        summary: "List active deployments",
        tags: ["ML Deployment"],
        security: [{ bearerAuth: [] }],
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      try {
        const deployments = await deploymentService.listDeployments();

        return {
          count: deployments.length,
          deployments,
        };
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          error: error.message || "Failed to list deployments",
        });
      }
    },
  );
};

export default mlDeploymentRoutes;
