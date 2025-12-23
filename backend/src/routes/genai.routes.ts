import { FastifyInstance } from "fastify";
import {
  ZodTypeProvider,
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { z } from "zod";
import { GenAIService } from "../services/genai.service";
import multipart from "@fastify/multipart";
import { UserPayload } from "../services/auth.service";

export const genaiRoutes = async (app: FastifyInstance) => {
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  const server = app.withTypeProvider<ZodTypeProvider>();

  // Register multipart support for file uploads
  // Increase file size limit to 10MB
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });

  server.post(
    "/upload",
    {
      schema: {
        tags: ["genai"],
        summary: "Upload a PDF document for ingestion",
        consumes: ["multipart/form-data"],
        security: [{ bearerAuth: [] }],
        response: {
          202: z.object({
            jobId: z.string().or(z.number()),
            message: z.string(),
            status: z.string(),
          }),
          400: z.object({ message: z.string() }),
          500: z.object({ message: z.string() }),
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const user = request.user as UserPayload;
      const parts = request.parts();
      let fileBuffer: Buffer | undefined;
      let filename = "";
      let mimetype = "";
      let siteId: string | null = null;
      const metadata: Record<string, any> = {};

      for await (const part of parts) {
        if (part.type === "file") {
          if (fileBuffer) {
            // Only support one file for now
            continue;
          }
          fileBuffer = await part.toBuffer();
          filename = part.filename;
          mimetype = part.mimetype;
        } else if (part.type === "field") {
          // Collect metadata fields
          if (part.fieldname === "siteId") {
            siteId = part.value as string;
          } else if (["assetId", "type", "category"].includes(part.fieldname)) {
            metadata[part.fieldname] = part.value;
          }
        }
      }

      if (!fileBuffer) {
        return reply.status(400).send({ message: "No file uploaded" });
      }

      try {
        const result = await GenAIService.ingestDocument(
          fileBuffer,
          filename,
          user.tenantId,
          siteId,
          {
            ...metadata,
            mimetype,
          },
        );
        return reply.status(202).send(result as any);
      } catch (e: any) {
        request.log.error(e);
        return reply
          .status(500)
          .send({ message: `Ingestion failed: ${e.message}` });
      }
    },
  );

  server.get(
    "/jobs/:id",
    {
      schema: {
        tags: ["genai"],
        summary: "Get ingestion job status",
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string(),
        }),
        response: {
          200: z.object({
            id: z.string(),
            state: z.string(),
            progress: z.number().optional(),
            result: z.any().optional(),
          }),
          404: z.object({ message: z.string() }),
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const status = await GenAIService.getJobStatus(request.params.id);
      if (!status) {
        return reply.status(404).send({ message: "Job not found" });
      }
      return reply.send(status);
    },
  );

  server.post(
    "/chat",
    {
      schema: {
        tags: ["genai"],
        summary: "Chat with the Knowledge Base",
        security: [{ bearerAuth: [] }],
        body: z.object({
          query: z.string().min(1),
        }),
        response: {
          200: z.object({
            answer: z.string(),
            context: z.array(
              z.object({
                id: z.string(),
                content: z.string(),
                metadata: z.object({}).passthrough(),
                distance: z.number(),
              }),
            ),
          }),
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const user = request.user as UserPayload;
      const { query } = request.body;

      // TODO: Fetch user's accessible siteIds from user_sites table
      // For now, passing undefined means user can access all tenant sites
      const result = await GenAIService.query(
        query,
        user.tenantId,
        undefined,
      );
      return reply.status(200).send(result as any);
    },
  );

  server.get(
    "/documents",
    {
      schema: {
        tags: ["genai"],
        summary: "List uploaded documents",
        security: [{ bearerAuth: [] }],
        response: {
          200: z.array(
            z.object({
              filename: z.string(),
              siteId: z.string().nullable().optional(),
              uploadedAt: z.date().nullable().or(z.string()),
              chunkCount: z.number(),
            }),
          ),
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const user = request.user as UserPayload;
      const docs = await GenAIService.listDocuments(user.tenantId);
      return reply.send(docs);
    },
  );

  server.delete(
    "/documents/:filename",
    {
      schema: {
        tags: ["genai"],
        summary: "Delete a document and its embeddings",
        security: [{ bearerAuth: [] }],
        params: z.object({
          filename: z.string(),
        }),
        response: {
          200: z.object({
            message: z.string(),
            filename: z.string(),
          }),
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const user = request.user as UserPayload;
      const { filename } = request.params;
      const result = await GenAIService.deleteDocument(filename, user.tenantId);
      return reply.send(result);
    },
  );

  // New endpoint: Submit feedback
  server.post(
    "/feedback",
    {
      schema: {
        tags: ["genai"],
        summary: "Submit feedback for a GenAI response",
        security: [{ bearerAuth: [] }],
        body: z.object({
          query: z.string(),
          answer: z.string(),
          rating: z.enum(["positive", "negative"]),
          contextIds: z.array(z.string()),
          comment: z.string().optional(),
        }),
        response: {
          201: z.object({
            id: z.string(),
            message: z.string(),
          }),
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const user = request.user as UserPayload;
      const { query, answer, rating, contextIds, comment } = request.body;

      const feedback = await GenAIService.submitFeedback(
        user.id,
        user.tenantId,
        query,
        answer,
        rating,
        contextIds,
        comment,
      );

      return reply.status(201).send({
        id: feedback.id,
        message: "Feedback submitted successfully",
      });
    },
  );

  // New endpoint: Get feedback stats (admin/analytics)
  server.get(
    "/feedback/stats",
    {
      schema: {
        tags: ["genai"],
        summary: "Get feedback statistics",
        security: [{ bearerAuth: [] }],
        querystring: z.object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        }),
        response: {
          200: z.object({
            stats: z.array(z.any()),
            total: z.number(),
          }),
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const user = request.user as UserPayload;
      const { startDate, endDate } = request.query as {
        startDate?: string;
        endDate?: string;
      };

      const stats = await GenAIService.getFeedbackStats(
        user.tenantId,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined,
      );

      return reply.send(stats);
    },
  );
};
