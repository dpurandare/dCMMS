import { FastifyInstance } from "fastify";
import { ZodTypeProvider, serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { z } from "zod";
import { GenAIService } from "../services/genai.service";
import multipart from "@fastify/multipart";

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
                response: {
                    201: z.object({
                        id: z.string(),
                        filename: z.string(),
                        chunksTotal: z.number(),
                        chunksIngested: z.number(),
                        status: z.enum(["success", "partial_success", "failed"]),
                    }),
                    400: z.object({ message: z.string() }),
                    500: z.object({ message: z.string() })
                },
            },
        },
        async (request, reply) => {
            const parts = request.parts();
            let fileBuffer: Buffer | undefined;
            let filename = "";
            let mimetype = "";
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
                    if (["assetId", "type", "category"].includes(part.fieldname)) {
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
                    { ...metadata, mimetype }
                );
                return reply.status(201).send(result as any);
            } catch (e: any) {
                request.log.error(e);
                return reply.status(500).send({ message: `Ingestion failed: ${e.message}` });
            }
        }
    );

    server.post(
        "/chat",
        {
            schema: {
                tags: ["genai"],
                summary: "Chat with the Knowledge Base",
                body: z.object({
                    query: z.string().min(1),
                }),
                response: {
                    200: z.object({
                        answer: z.string(),
                        context: z.array(z.object({
                            id: z.string(),
                            content: z.string(),
                            metadata: z.object({}).passthrough(),
                            distance: z.number()
                        }))
                    }),
                },
                // security: [{ bearerAuth: [] }],
            },
            // preHandler: authenticate, // TODO: Enable auth
        },
        async (request, reply) => {
            const { query } = request.body;
            const result = await GenAIService.query(query);
            return reply.status(200).send(result as any);
        }
    );
};
