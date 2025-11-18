import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db';
import { webhooks } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import { createWebhookService } from '../services/webhook.service';

// Validation schemas
const registerWebhookSchema = z.object({
  name: z.string().min(1).max(255),
  url: z.string().url(),
  authType: z.enum(['none', 'bearer', 'basic', 'api_key']).default('none'),
  authToken: z.string().optional(),
  authUsername: z.string().optional(),
  authPassword: z.string().optional(),
  headers: z.record(z.string()).optional(),
  events: z.array(z.string()).min(1),
});

const updateWebhookSchema = registerWebhookSchema.partial();

export default async function webhookRoutes(fastify: FastifyInstance) {
  const webhookService = createWebhookService(fastify);

  // Register webhook
  fastify.post<{
    Body: z.infer<typeof registerWebhookSchema> & { tenantId: string };
  }>(
    '/webhooks',
    {
      schema: {
        body: registerWebhookSchema.extend({
          tenantId: z.string().uuid(),
        }),
      },
    },
    async (request, reply) => {
      try {
        const {
          tenantId,
          name,
          url,
          authType,
          authToken,
          authUsername,
          authPassword,
          headers,
          events,
        } = request.body;

        // Generate webhook ID and secret
        const webhookId = `webhook_${crypto.randomBytes(16).toString('hex')}`;
        const secret = crypto.randomBytes(32).toString('hex');

        // Insert webhook
        const [webhook] = await db
          .insert(webhooks)
          .values({
            tenantId,
            webhookId,
            name,
            url,
            authType,
            authToken,
            authUsername,
            authPassword,
            headers: JSON.stringify(headers || {}),
            events: JSON.stringify(events),
            secret,
            isActive: true,
          })
          .returning();

        fastify.log.info({ webhookId, tenantId }, 'Webhook registered');

        return reply.status(201).send({
          webhook: {
            ...webhook,
            authToken: webhook.authToken ? '***REDACTED***' : undefined,
            authPassword: webhook.authPassword ? '***REDACTED***' : undefined,
          },
          secret, // Return secret only once during registration
        });
      } catch (error) {
        fastify.log.error({ error }, 'Failed to register webhook');
        return reply.status(500).send({
          error: 'Failed to register webhook',
        });
      }
    }
  );

  // List webhooks
  fastify.get<{
    Querystring: {
      tenantId: string;
      limit?: string;
      offset?: string;
    };
  }>('/webhooks', async (request, reply) => {
    try {
      const { tenantId } = request.query;
      const limit = parseInt(request.query.limit || '50');
      const offset = parseInt(request.query.offset || '0');

      const tenantWebhooks = await db.query.webhooks.findMany({
        where: eq(webhooks.tenantId, tenantId),
        limit,
        offset,
        orderBy: (webhooks, { desc }) => [desc(webhooks.createdAt)],
      });

      // Redact sensitive information
      const sanitizedWebhooks = tenantWebhooks.map((webhook) => ({
        ...webhook,
        authToken: webhook.authToken ? '***REDACTED***' : undefined,
        authPassword: webhook.authPassword ? '***REDACTED***' : undefined,
        secret: '***REDACTED***', // Never expose secret after registration
      }));

      return reply.send({
        webhooks: sanitizedWebhooks,
        pagination: {
          limit,
          offset,
          total: sanitizedWebhooks.length,
        },
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to list webhooks');
      return reply.status(500).send({
        error: 'Failed to list webhooks',
      });
    }
  });

  // Get webhook by ID
  fastify.get<{
    Params: { webhookId: string };
  }>('/webhooks/:webhookId', async (request, reply) => {
    try {
      const { webhookId } = request.params;

      const webhook = await db.query.webhooks.findFirst({
        where: eq(webhooks.id, webhookId),
      });

      if (!webhook) {
        return reply.status(404).send({
          error: 'Webhook not found',
        });
      }

      // Redact sensitive information
      const sanitizedWebhook = {
        ...webhook,
        authToken: webhook.authToken ? '***REDACTED***' : undefined,
        authPassword: webhook.authPassword ? '***REDACTED***' : undefined,
        secret: '***REDACTED***',
      };

      return reply.send({
        webhook: sanitizedWebhook,
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get webhook');
      return reply.status(500).send({
        error: 'Failed to get webhook',
      });
    }
  });

  // Update webhook
  fastify.put<{
    Params: { webhookId: string };
    Body: z.infer<typeof updateWebhookSchema>;
  }>(
    '/webhooks/:webhookId',
    {
      schema: {
        body: updateWebhookSchema,
      },
    },
    async (request, reply) => {
      try {
        const { webhookId } = request.params;
        const updates = request.body;

        // Check if webhook exists
        const existing = await db.query.webhooks.findFirst({
          where: eq(webhooks.id, webhookId),
        });

        if (!existing) {
          return reply.status(404).send({
            error: 'Webhook not found',
          });
        }

        // Prepare update data
        const updateData: any = {};
        if (updates.name) updateData.name = updates.name;
        if (updates.url) updateData.url = updates.url;
        if (updates.authType) updateData.authType = updates.authType;
        if (updates.authToken) updateData.authToken = updates.authToken;
        if (updates.authUsername) updateData.authUsername = updates.authUsername;
        if (updates.authPassword) updateData.authPassword = updates.authPassword;
        if (updates.headers) updateData.headers = JSON.stringify(updates.headers);
        if (updates.events) updateData.events = JSON.stringify(updates.events);
        updateData.updatedAt = new Date();

        // Update webhook
        const [updated] = await db
          .update(webhooks)
          .set(updateData)
          .where(eq(webhooks.id, webhookId))
          .returning();

        fastify.log.info({ webhookId }, 'Webhook updated');

        // Redact sensitive information
        const sanitizedWebhook = {
          ...updated,
          authToken: updated.authToken ? '***REDACTED***' : undefined,
          authPassword: updated.authPassword ? '***REDACTED***' : undefined,
          secret: '***REDACTED***',
        };

        return reply.send({
          webhook: sanitizedWebhook,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Failed to update webhook');
        return reply.status(500).send({
          error: 'Failed to update webhook',
        });
      }
    }
  );

  // Delete webhook
  fastify.delete<{
    Params: { webhookId: string };
  }>('/webhooks/:webhookId', async (request, reply) => {
    try {
      const { webhookId } = request.params;

      const result = await db
        .delete(webhooks)
        .where(eq(webhooks.id, webhookId))
        .returning();

      if (result.length === 0) {
        return reply.status(404).send({
          error: 'Webhook not found',
        });
      }

      fastify.log.info({ webhookId }, 'Webhook deleted');

      return reply.send({
        message: 'Webhook deleted successfully',
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to delete webhook');
      return reply.status(500).send({
        error: 'Failed to delete webhook',
      });
    }
  });

  // Test webhook
  fastify.post<{
    Params: { webhookId: string };
  }>('/webhooks/:webhookId/test', async (request, reply) => {
    try {
      const { webhookId } = request.params;

      const result = await webhookService.testWebhook(webhookId);

      fastify.log.info({ webhookId, result }, 'Webhook test completed');

      return reply.send({
        result,
        message: result.status === 'success' ? 'Webhook test successful' : 'Webhook test failed',
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to test webhook');
      return reply.status(500).send({
        error: 'Failed to test webhook',
      });
    }
  });

  // Get webhook deliveries
  fastify.get<{
    Params: { webhookId: string };
    Querystring: {
      limit?: string;
      offset?: string;
    };
  }>('/webhooks/:webhookId/deliveries', async (request, reply) => {
    try {
      const { webhookId } = request.params;
      const limit = parseInt(request.query.limit || '50');
      const offset = parseInt(request.query.offset || '0');

      const deliveries = await webhookService.getDeliveries(webhookId, { limit, offset });

      return reply.send({
        deliveries,
        pagination: {
          limit,
          offset,
          total: deliveries.length,
        },
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get webhook deliveries');
      return reply.status(500).send({
        error: 'Failed to get webhook deliveries',
      });
    }
  });

  // Enable/disable webhook
  fastify.patch<{
    Params: { webhookId: string };
    Body: { isActive: boolean };
  }>('/webhooks/:webhookId/status', async (request, reply) => {
    try {
      const { webhookId } = request.params;
      const { isActive } = request.body;

      const [updated] = await db
        .update(webhooks)
        .set({
          isActive,
          updatedAt: new Date(),
        })
        .where(eq(webhooks.id, webhookId))
        .returning();

      if (!updated) {
        return reply.status(404).send({
          error: 'Webhook not found',
        });
      }

      fastify.log.info({ webhookId, isActive }, 'Webhook status updated');

      return reply.send({
        message: `Webhook ${isActive ? 'enabled' : 'disabled'} successfully`,
        webhook: {
          id: updated.id,
          isActive: updated.isActive,
        },
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to update webhook status');
      return reply.status(500).send({
        error: 'Failed to update webhook status',
      });
    }
  });
}
