import { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  validatorCompiler,
  serializerCompiler,
} from "fastify-type-provider-zod";
import { createFeastFeatureService } from "../services/feast-feature.service";

// Validation schemas
const getAssetFeaturesSchema = z.object({
  assetIds: z.array(z.string().uuid()).min(1).max(100),
});

const triggerMaterializationSchema = z.object({
  force: z.boolean().optional().default(false),
});

/**
 * ML Feature Routes
 * Feast feature store integration for ML model serving
 */
export default async function mlFeatureRoutes(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  const featureService = createFeastFeatureService(fastify);

  // ==========================================
  // Feature Retrieval
  // ==========================================

  // Get asset features for ML models
  fastify.post<{
    Body: z.infer<typeof getAssetFeaturesSchema>;
  }>(
    "/ml/features/assets",
    {
      schema: {
        body: getAssetFeaturesSchema,
        tags: ["ML"],
        description: "Get asset features from Feast feature store",
      },
    },
    async (request, reply) => {
      try {
        const { assetIds } = request.body;

        const features = await featureService.getAssetFeatures(assetIds);

        return reply.send({
          count: features.length,
          features,
        });
      } catch (error: any) {
        fastify.log.error({ error }, "Failed to get asset features");
        return reply.status(500).send({
          error: "Failed to get asset features",
          message: error.message,
        });
      }
    },
  );

  // ==========================================
  // Feature Store Management
  // ==========================================

  // List available feature views
  fastify.get(
    "/ml/features/views",
    {
      schema: {
        tags: ["ML"],
        description: "List available Feast feature views",
      },
    },
    async (request, reply) => {
      try {
        const featureViews = await featureService.listFeatureViews();

        return reply.send({
          count: featureViews.length,
          featureViews,
        });
      } catch (error) {
        fastify.log.error({ error }, "Failed to list feature views");
        return reply.status(500).send({
          error: "Failed to list feature views",
        });
      }
    },
  );

  // Check Feast server health
  fastify.get(
    "/ml/features/health",
    {
      schema: {
        tags: ["ML"],
        description: "Check Feast feature server health",
      },
    },
    async (request, reply) => {
      try {
        const healthy = await featureService.checkHealth();

        return reply.send({
          healthy,
          status: healthy ? "ok" : "unhealthy",
        });
      } catch (error) {
        fastify.log.error({ error }, "Failed to check Feast health");
        return reply.status(500).send({
          error: "Failed to check Feast health",
        });
      }
    },
  );

  // ==========================================
  // Feature Materialization (Admin)
  // ==========================================

  // Trigger feature materialization
  fastify.post<{
    Body: z.infer<typeof triggerMaterializationSchema>;
  }>(
    "/ml/features/materialize",
    {
      schema: {
        body: triggerMaterializationSchema,
        tags: ["ML"],
        description: "Trigger Feast feature materialization (admin-only)",
      },
    },
    async (request, reply) => {
      try {
        const userRole = request.user.role;

        if (userRole !== "super_admin" && userRole !== "tenant_admin") {
          return reply.status(403).send({
            error: "Forbidden",
            message: "Only administrators can trigger feature materialization",
          });
        }

        // Trigger materialization asynchronously
        featureService
          .triggerMaterialization()
          .then(() => {
            fastify.log.info("Feature materialization completed");
          })
          .catch((error) => {
            fastify.log.error({ error }, "Feature materialization failed");
          });

        return reply.status(202).send({
          message: "Feature materialization triggered",
          status: "processing",
        });
      } catch (error: any) {
        fastify.log.error({ error }, "Failed to trigger materialization");
        return reply.status(500).send({
          error: "Failed to trigger materialization",
          message: error.message,
        });
      }
    },
  );
}
