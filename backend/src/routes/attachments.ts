import { FastifyPluginAsync } from "fastify";
import { FileStorageService } from "../services/file-storage.service";
import { db } from "../db";
import { workOrderAttachments, workOrders } from "../db/schema";
import { eq, and } from "drizzle-orm";

const attachmentsRoutes: FastifyPluginAsync = async (server) => {
  // Import CSRF protection
  const { csrfProtection } = await import('../middleware/csrf');

  // POST /api/v1/work-orders/:workOrderId/attachments
  server.post(
    "/:workOrderId/attachments",
    {
      schema: {
        description: "Upload file attachment to work order",
        tags: ["attachments"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            workOrderId: { type: "string", format: "uuid" },
          },
          required: ["workOrderId"],
        },
        response: {
          201: {
            type: "object",
            properties: {
              id: { type: "string" },
              workOrderId: { type: "string" },
              fileName: { type: "string" },
              fileSize: { type: "number" },
              mimeType: { type: "string" },
              fileUrl: { type: "string" },
              storageKey: { type: "string" },
              createdAt: { type: "string" },
            },
          },
        },
      },
      preHandler: [server.authenticate, csrfProtection],
    },
    async (request, reply) => {
      const { workOrderId } = request.params as { workOrderId: string };
      const user = request.user as { id: string; tenantId: string };

      try {
        // Verify work order exists and belongs to user's tenant
        const [workOrder] = await db
          .select()
          .from(workOrders)
          .where(
            and(
              eq(workOrders.id, workOrderId),
              eq(workOrders.tenantId, user.tenantId)
            )
          )
          .limit(1);

        if (!workOrder) {
          return reply.status(404).send({
            statusCode: 404,
            error: "Not Found",
            message: "Work order not found",
          });
        }

        // Get uploaded file from multipart request
        const data = await request.file();

        if (!data) {
          return reply.status(400).send({
            statusCode: 400,
            error: "Bad Request",
            message: "No file uploaded",
          });
        }

        // Upload file using storage service
        const uploadResult = await FileStorageService.uploadFile(
          data,
          `work-orders/${workOrderId}`
        );

        // Save attachment metadata to database
        const [attachment] = await db
          .insert(workOrderAttachments)
          .values({
            workOrderId,
            fileName: uploadResult.fileName,
            fileSize: uploadResult.fileSize,
            mimeType: uploadResult.mimeType,
            fileUrl: uploadResult.fileUrl,
            storageKey: uploadResult.storageKey,
            uploadedBy: user.id,
          })
          .returning();

        return reply.status(201).send(attachment);
      } catch (error) {
        request.log.error({ err: error }, "File upload error");
        return reply.status(500).send({
          statusCode: 500,
          error: "Internal Server Error",
          message:
            error instanceof Error ? error.message : "Failed to upload file",
        });
      }
    }
  );

  // GET /api/v1/work-orders/:workOrderId/attachments
  server.get(
    "/:workOrderId/attachments",
    {
      schema: {
        description: "List all attachments for a work order",
        tags: ["attachments"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            workOrderId: { type: "string", format: "uuid" },
          },
          required: ["workOrderId"],
        },
        response: {
          200: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                workOrderId: { type: "string" },
                fileName: { type: "string" },
                fileSize: { type: "number" },
                mimeType: { type: "string" },
                fileUrl: { type: "string" },
                createdAt: { type: "string" },
                uploadedBy: { type: "string" },
              },
            },
          },
        },
      },
      preHandler: [server.authenticate, csrfProtection],
    },
    async (request, reply) => {
      const { workOrderId } = request.params as { workOrderId: string };
      const user = request.user as { tenantId: string };

      try {
        // Verify work order exists and belongs to user's tenant
        const [workOrder] = await db
          .select()
          .from(workOrders)
          .where(
            and(
              eq(workOrders.id, workOrderId),
              eq(workOrders.tenantId, user.tenantId)
            )
          )
          .limit(1);

        if (!workOrder) {
          return reply.status(404).send({
            statusCode: 404,
            error: "Not Found",
            message: "Work order not found",
          });
        }

        // Get all attachments for this work order
        const attachments = await db
          .select({
            id: workOrderAttachments.id,
            workOrderId: workOrderAttachments.workOrderId,
            fileName: workOrderAttachments.fileName,
            fileSize: workOrderAttachments.fileSize,
            mimeType: workOrderAttachments.mimeType,
            fileUrl: workOrderAttachments.fileUrl,
            createdAt: workOrderAttachments.createdAt,
            uploadedBy: workOrderAttachments.uploadedBy,
          })
          .from(workOrderAttachments)
          .where(eq(workOrderAttachments.workOrderId, workOrderId));

        return attachments;
      } catch (error) {
        request.log.error({ err: error }, "List attachments error");
        return reply.status(500).send({
          statusCode: 500,
          error: "Internal Server Error",
          message: "Failed to list attachments",
        });
      }
    }
  );

  // GET /api/v1/work-orders/:workOrderId/attachments/:attachmentId
  server.get(
    "/:workOrderId/attachments/:attachmentId",
    {
      schema: {
        description: "Download a file attachment",
        tags: ["attachments"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            workOrderId: { type: "string", format: "uuid" },
            attachmentId: { type: "string", format: "uuid" },
          },
          required: ["workOrderId", "attachmentId"],
        },
      },
      preHandler: [server.authenticate, csrfProtection],
    },
    async (request, reply) => {
      const { workOrderId, attachmentId } = request.params as {
        workOrderId: string;
        attachmentId: string;
      };
      const user = request.user as { tenantId: string };

      try {
        // Get attachment metadata
        const [attachment] = await db
          .select()
          .from(workOrderAttachments)
          .where(
            and(
              eq(workOrderAttachments.id, attachmentId),
              eq(workOrderAttachments.workOrderId, workOrderId)
            )
          )
          .limit(1);

        if (!attachment) {
          return reply.status(404).send({
            statusCode: 404,
            error: "Not Found",
            message: "Attachment not found",
          });
        }

        // Verify work order belongs to user's tenant
        const [workOrder] = await db
          .select()
          .from(workOrders)
          .where(
            and(
              eq(workOrders.id, workOrderId),
              eq(workOrders.tenantId, user.tenantId)
            )
          )
          .limit(1);

        if (!workOrder) {
          return reply.status(404).send({
            statusCode: 404,
            error: "Not Found",
            message: "Work order not found",
          });
        }

        // Get file stream
        const fileStream = FileStorageService.getFileStream(
          attachment.storageKey,
          `work-orders/${workOrderId}`
        );

        // Set headers for file download
        reply.header("Content-Type", attachment.mimeType);
        reply.header(
          "Content-Disposition",
          `attachment; filename="${attachment.fileName}"`
        );
        reply.header("Content-Length", attachment.fileSize);

        return reply.send(fileStream);
      } catch (error) {
        request.log.error({ err: error }, "File download error");
        return reply.status(500).send({
          statusCode: 500,
          error: "Internal Server Error",
          message:
            error instanceof Error ? error.message : "Failed to download file",
        });
      }
    }
  );

  // DELETE /api/v1/work-orders/:workOrderId/attachments/:attachmentId
  server.delete(
    "/:workOrderId/attachments/:attachmentId",
    {
      schema: {
        description: "Delete a file attachment",
        tags: ["attachments"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            workOrderId: { type: "string", format: "uuid" },
            attachmentId: { type: "string", format: "uuid" },
          },
          required: ["workOrderId", "attachmentId"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const { workOrderId, attachmentId } = request.params as {
        workOrderId: string;
        attachmentId: string;
      };
      const user = request.user as { tenantId: string };

      try {
        // Get attachment metadata
        const [attachment] = await db
          .select()
          .from(workOrderAttachments)
          .where(
            and(
              eq(workOrderAttachments.id, attachmentId),
              eq(workOrderAttachments.workOrderId, workOrderId)
            )
          )
          .limit(1);

        if (!attachment) {
          return reply.status(404).send({
            statusCode: 404,
            error: "Not Found",
            message: "Attachment not found",
          });
        }

        // Verify work order belongs to user's tenant
        const [workOrder] = await db
          .select()
          .from(workOrders)
          .where(
            and(
              eq(workOrders.id, workOrderId),
              eq(workOrders.tenantId, user.tenantId)
            )
          )
          .limit(1);

        if (!workOrder) {
          return reply.status(404).send({
            statusCode: 404,
            error: "Not Found",
            message: "Work order not found",
          });
        }

        // Delete file from storage
        await FileStorageService.deleteFile(
          attachment.storageKey,
          `work-orders/${workOrderId}`
        );

        // Delete attachment record from database
        await db
          .delete(workOrderAttachments)
          .where(eq(workOrderAttachments.id, attachmentId));

        return {
          message: "Attachment deleted successfully",
        };
      } catch (error) {
        request.log.error({ err: error }, "File deletion error");
        return reply.status(500).send({
          statusCode: 500,
          error: "Internal Server Error",
          message:
            error instanceof Error ? error.message : "Failed to delete file",
        });
      }
    }
  );
};

export default attachmentsRoutes;
