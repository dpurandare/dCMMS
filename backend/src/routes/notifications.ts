import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db';
import { notificationPreferences, notificationHistory, deviceTokens } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';

// Validation schemas
const notificationPreferenceSchema = z.object({
  eventType: z.enum([
    'work_order_assigned',
    'work_order_overdue',
    'work_order_completed',
    'alert_critical',
    'alert_high',
    'alert_medium',
    'alert_acknowledged',
    'alert_resolved',
    'asset_down',
    'maintenance_due',
  ]),
  channel: z.enum(['email', 'sms', 'push', 'webhook', 'slack']),
  isEnabled: z.boolean(),
  quietHoursStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  quietHoursEnd: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
});

const updatePreferencesSchema = z.object({
  preferences: z.array(notificationPreferenceSchema),
});

const deviceTokenSchema = z.object({
  token: z.string().min(10),
  deviceType: z.enum(['ios', 'android']),
  deviceId: z.string().optional(),
  appVersion: z.string().optional(),
});

export default async function notificationRoutes(fastify: FastifyInstance) {
  // Get user notification preferences
  fastify.get<{
    Params: { userId: string };
  }>('/users/:userId/notification-preferences', async (request, reply) => {
    try {
      const { userId } = request.params;

      // Get existing preferences
      const preferences = await db.query.notificationPreferences.findMany({
        where: eq(notificationPreferences.userId, userId),
      });

      // If no preferences exist, return default preferences
      if (preferences.length === 0) {
        const defaultPreferences = getDefaultPreferences();
        return reply.send({
          userId,
          preferences: defaultPreferences,
        });
      }

      return reply.send({
        userId,
        preferences,
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get notification preferences');
      return reply.status(500).send({
        error: 'Failed to get notification preferences',
      });
    }
  });

  // Update user notification preferences
  fastify.put<{
    Params: { userId: string };
    Body: z.infer<typeof updatePreferencesSchema>;
  }>(
    '/users/:userId/notification-preferences',
    {
      schema: {
        body: updatePreferencesSchema,
      },
    },
    async (request, reply) => {
      try {
        const { userId } = request.params;
        const { preferences: newPreferences } = request.body;

        // Delete existing preferences
        await db
          .delete(notificationPreferences)
          .where(eq(notificationPreferences.userId, userId));

        // Insert new preferences
        if (newPreferences.length > 0) {
          await db.insert(notificationPreferences).values(
            newPreferences.map((pref) => ({
              userId,
              eventType: pref.eventType,
              channel: pref.channel,
              isEnabled: pref.isEnabled,
              quietHoursStart: pref.quietHoursStart || null,
              quietHoursEnd: pref.quietHoursEnd || null,
            }))
          );
        }

        // Get updated preferences
        const updated = await db.query.notificationPreferences.findMany({
          where: eq(notificationPreferences.userId, userId),
        });

        fastify.log.info({ userId, count: updated.length }, 'Updated notification preferences');

        return reply.send({
          userId,
          preferences: updated,
          message: 'Notification preferences updated successfully',
        });
      } catch (error) {
        fastify.log.error({ error }, 'Failed to update notification preferences');
        return reply.status(500).send({
          error: 'Failed to update notification preferences',
        });
      }
    }
  );

  // Get notification history
  fastify.get<{
    Params: { userId: string };
    Querystring: {
      limit?: string;
      offset?: string;
      status?: string;
      channel?: string;
      eventType?: string;
      startDate?: string;
      endDate?: string;
    };
  }>('/users/:userId/notification-history', async (request, reply) => {
    try {
      const { userId } = request.params;
      const limit = parseInt(request.query.limit || '50');
      const offset = parseInt(request.query.offset || '0');
      const { status, channel, eventType, startDate, endDate } = request.query;

      // Build where clause
      let whereConditions = [eq(notificationHistory.userId, userId)];

      if (status) {
        whereConditions.push(eq(notificationHistory.status, status as any));
      }

      if (channel) {
        whereConditions.push(eq(notificationHistory.channel, channel as any));
      }

      if (eventType) {
        whereConditions.push(eq(notificationHistory.eventType, eventType as any));
      }

      const history = await db.query.notificationHistory.findMany({
        where: and(...whereConditions),
        orderBy: [desc(notificationHistory.createdAt)],
        limit,
        offset,
      });

      return reply.send({
        userId,
        history,
        pagination: {
          limit,
          offset,
          total: history.length,
        },
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get notification history');
      return reply.status(500).send({
        error: 'Failed to get notification history',
      });
    }
  });

  // Get notification metrics (admin-only)
  fastify.get<{
    Querystring: {
      tenantId: string;
      startDate?: string;
      endDate?: string;
      channel?: string;
      eventType?: string;
    };
  }>('/notifications/metrics', async (request, reply) => {
    try {
      const { tenantId, startDate, endDate, channel, eventType } = request.query;

      // TODO: Add RBAC check - only admin users should access this endpoint
      // For now, we'll allow all authenticated users

      // Build where clause
      let whereConditions = [eq(notificationHistory.tenantId, tenantId)];

      if (channel) {
        whereConditions.push(eq(notificationHistory.channel, channel as any));
      }

      if (eventType) {
        whereConditions.push(eq(notificationHistory.eventType, eventType as any));
      }

      // Get all notifications for metrics
      const notifications = await db.query.notificationHistory.findMany({
        where: and(...whereConditions),
      });

      // Calculate metrics
      const totalSent = notifications.length;
      const successfulDeliveries = notifications.filter((n) => n.status === 'sent' || n.status === 'delivered').length;
      const failedDeliveries = notifications.filter((n) => n.status === 'failed').length;
      const pendingDeliveries = notifications.filter((n) => n.status === 'pending').length;
      const bouncedDeliveries = notifications.filter((n) => n.status === 'bounced').length;

      const deliveryRate = totalSent > 0 ? (successfulDeliveries / totalSent) * 100 : 0;

      // Group by channel
      const byChannel = {
        email: notifications.filter((n) => n.channel === 'email').length,
        sms: notifications.filter((n) => n.channel === 'sms').length,
        push: notifications.filter((n) => n.channel === 'push').length,
        webhook: notifications.filter((n) => n.channel === 'webhook').length,
        slack: notifications.filter((n) => n.channel === 'slack').length,
      };

      // Group by event type
      const byEventType: Record<string, number> = {};
      for (const notification of notifications) {
        const type = notification.eventType;
        byEventType[type] = (byEventType[type] || 0) + 1;
      }

      // Group by status
      const byStatus = {
        pending: pendingDeliveries,
        sent: notifications.filter((n) => n.status === 'sent').length,
        delivered: notifications.filter((n) => n.status === 'delivered').length,
        failed: failedDeliveries,
        bounced: bouncedDeliveries,
      };

      return reply.send({
        metrics: {
          totalSent,
          successfulDeliveries,
          failedDeliveries,
          pendingDeliveries,
          bouncedDeliveries,
          deliveryRate: Math.round(deliveryRate * 100) / 100, // Round to 2 decimal places
          byChannel,
          byEventType,
          byStatus,
        },
        period: {
          startDate: startDate || 'all time',
          endDate: endDate || 'now',
        },
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get notification metrics');
      return reply.status(500).send({
        error: 'Failed to get notification metrics',
      });
    }
  });

  // Get all notification history (admin-only, for auditing)
  fastify.get<{
    Querystring: {
      tenantId: string;
      userId?: string;
      status?: string;
      channel?: string;
      eventType?: string;
      startDate?: string;
      endDate?: string;
      limit?: string;
      offset?: string;
    };
  }>('/notifications/history', async (request, reply) => {
    try {
      const { tenantId, userId, status, channel, eventType } = request.query;
      const limit = parseInt(request.query.limit || '100');
      const offset = parseInt(request.query.offset || '0');

      // TODO: Add RBAC check - only admin users should access this endpoint

      // Build where clause
      let whereConditions = [eq(notificationHistory.tenantId, tenantId)];

      if (userId) {
        whereConditions.push(eq(notificationHistory.userId, userId));
      }

      if (status) {
        whereConditions.push(eq(notificationHistory.status, status as any));
      }

      if (channel) {
        whereConditions.push(eq(notificationHistory.channel, channel as any));
      }

      if (eventType) {
        whereConditions.push(eq(notificationHistory.eventType, eventType as any));
      }

      const history = await db.query.notificationHistory.findMany({
        where: and(...whereConditions),
        orderBy: [desc(notificationHistory.createdAt)],
        limit,
        offset,
        with: {
          user: {
            columns: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return reply.send({
        history,
        pagination: {
          limit,
          offset,
          total: history.length,
        },
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get notification history');
      return reply.status(500).send({
        error: 'Failed to get notification history',
      });
    }
  });

  // Register device token for push notifications
  fastify.post<{
    Body: z.infer<typeof deviceTokenSchema> & { userId: string };
  }>(
    '/users/device-token',
    {
      schema: {
        body: deviceTokenSchema.extend({
          userId: z.string().uuid(),
        }),
      },
    },
    async (request, reply) => {
      try {
        const { userId, token, deviceType, deviceId, appVersion } = request.body;

        // Import push notification service
        const { createPushNotificationService } = await import(
          '../services/push-notification.service'
        );
        const pushService = createPushNotificationService(fastify);

        // Register device token
        await pushService.registerDeviceToken(
          userId,
          token,
          deviceType,
          deviceId,
          appVersion
        );

        fastify.log.info({ userId, deviceType }, 'Device token registered');

        return reply.status(201).send({
          message: 'Device token registered successfully',
        });
      } catch (error) {
        fastify.log.error({ error }, 'Failed to register device token');
        return reply.status(500).send({
          error: 'Failed to register device token',
        });
      }
    }
  );

  // Unregister device token
  fastify.delete<{
    Body: { token: string };
  }>('/users/device-token', async (request, reply) => {
    try {
      const { token } = request.body;

      // Import push notification service
      const { createPushNotificationService } = await import(
        '../services/push-notification.service'
      );
      const pushService = createPushNotificationService(fastify);

      // Unregister device token
      await pushService.unregisterDeviceToken(token);

      fastify.log.info({ token: token.substring(0, 20) }, 'Device token unregistered');

      return reply.send({
        message: 'Device token unregistered successfully',
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to unregister device token');
      return reply.status(500).send({
        error: 'Failed to unregister device token',
      });
    }
  });

  // Test notification endpoint (for testing purposes)
  fastify.post<{
    Body: {
      userId: string;
      eventType: string;
      data: Record<string, any>;
    };
  }>('/notifications/test', async (request, reply) => {
    try {
      const { userId, eventType, data } = request.body;

      // Import notification service
      const { createNotificationService } = await import(
        '../services/notification.service'
      );
      const notificationService = createNotificationService(fastify);

      // Send test notification
      await notificationService.sendNotification({
        tenantId: 'default-tenant-id', // TODO: Get from auth context
        userId,
        templateCode: eventType,
        variables: data,
        channels: ['email', 'push'], // Default channels for test
      });

      return reply.send({
        message: 'Test notification sent successfully',
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to send test notification');
      return reply.status(500).send({
        error: 'Failed to send test notification',
      });
    }
  });
}

/**
 * Get default notification preferences
 */
function getDefaultPreferences() {
  const eventTypes: Array<
    | 'work_order_assigned'
    | 'work_order_overdue'
    | 'work_order_completed'
    | 'alert_critical'
    | 'alert_high'
    | 'alert_medium'
    | 'alert_acknowledged'
    | 'alert_resolved'
    | 'asset_down'
    | 'maintenance_due'
  > = [
      'work_order_assigned',
      'work_order_overdue',
      'work_order_completed',
      'alert_critical',
      'alert_high',
      'alert_medium',
      'alert_acknowledged',
      'alert_resolved',
      'asset_down',
      'maintenance_due',
    ];

  const channels: Array<'email' | 'sms' | 'push'> = ['email', 'sms', 'push'];

  const defaults = [];

  for (const eventType of eventTypes) {
    for (const channel of channels) {
      // Default: Enable email and push, disable SMS (to avoid costs)
      const isEnabled =
        (channel === 'email' || channel === 'push') &&
        (eventType === 'work_order_assigned' ||
          eventType === 'work_order_overdue' ||
          eventType === 'alert_critical' ||
          eventType === 'alert_high');

      defaults.push({
        eventType,
        channel,
        isEnabled,
      });
    }
  }

  return defaults;
}
