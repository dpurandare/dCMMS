import { FastifyInstance } from "fastify";
import { db } from "../db";
import {
  notificationQueue,
  notificationPreferences,
  notificationHistory,
  users,
} from "../db/schema";
import { eq, and, lte } from "drizzle-orm";
import {
  NotificationChannel,
  NotificationEventType,
} from "./notification.service";

export interface QueuedNotification {
  tenantId: string;
  userId: string;
  eventType: NotificationEventType;
  channel: NotificationChannel;
  priority: "critical" | "high" | "medium" | "low";
  subject?: string;
  body: string;
  templateId?: string;
  data: Record<string, unknown>;
}

/**
 * Notification Batching Service
 * Queues low/medium priority notifications and sends digest emails
 */
export class NotificationBatchingService {
  private fastify: FastifyInstance;
  private batchInterval: NodeJS.Timeout | null = null;
  private readonly DEFAULT_BATCH_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

  /**
   * Start the batch processing scheduler
   */
  start(): void {
    this.fastify.log.info("Starting notification batching scheduler");

    // Process batches every 15 minutes
    this.batchInterval = setInterval(async () => {
      try {
        await this.processBatches();
      } catch (error) {
        this.fastify.log.error(
          { error },
          "Failed to process notification batches",
        );
      }
    }, this.DEFAULT_BATCH_INTERVAL_MS);

    // Process immediately on start
    this.processBatches().catch((error) => {
      this.fastify.log.error({ error }, "Failed to process initial batches");
    });
  }

  /**
   * Stop the batch processing scheduler
   */
  stop(): void {
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
      this.batchInterval = null;
      this.fastify.log.info("Stopped notification batching scheduler");
    }
  }

  /**
   * Queue a notification for batching
   */
  async queueNotification(notification: QueuedNotification): Promise<void> {
    const {
      tenantId,
      userId,
      eventType,
      channel,
      priority,
      subject,
      body,
      templateId,
      data,
    } = notification;

    // Critical notifications should never be batched
    if (priority === "critical") {
      throw new Error("Critical notifications should not be batched");
    }

    // Check if user has batching enabled for this event type and channel
    const preference = await db.query.notificationPreferences.findFirst({
      where: and(
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.eventType, eventType),
        eq(notificationPreferences.channel, channel),
      ),
    });

    // If batching is disabled for this preference, skip queuing
    if (preference && !preference.enableBatching) {
      this.fastify.log.info(
        { userId, eventType, channel },
        "Batching disabled for this notification",
      );
      return;
    }

    // Generate batch key: userId_eventType_channel
    const batchKey = `${userId}_${eventType}_${channel}`;

    try {
      await db.insert(notificationQueue).values({
        tenantId,
        userId,
        eventType,
        channel,
        priority,
        subject,
        body,
        templateId,
        data: JSON.stringify(data),
        batchKey,
        isBatched: false,
      });

      this.fastify.log.info(
        { userId, eventType, channel, batchKey },
        "Notification queued for batching",
      );
    } catch (error) {
      this.fastify.log.error(
        { error, notification },
        "Failed to queue notification",
      );
      throw error;
    }
  }

  /**
   * Process all pending batches
   */
  async processBatches(): Promise<void> {
    this.fastify.log.info("Processing notification batches");

    try {
      // Get all unbatched notifications older than 15 minutes
      const cutoffTime = new Date(Date.now() - this.DEFAULT_BATCH_INTERVAL_MS);

      const unbatchedNotifications = await db.query.notificationQueue.findMany({
        where: and(
          eq(notificationQueue.isBatched, false),
          lte(notificationQueue.createdAt, cutoffTime),
        ),
        orderBy: (notificationQueue, { asc }) => [
          asc(notificationQueue.createdAt),
        ],
      });

      if (unbatchedNotifications.length === 0) {
        this.fastify.log.info("No notifications to batch");
        return;
      }

      // Group by batch key (userId_eventType_channel)
      const batches = new Map<string, typeof unbatchedNotifications>();

      for (const notification of unbatchedNotifications) {
        const existing = batches.get(notification.batchKey) || [];
        existing.push(notification);
        batches.set(notification.batchKey, existing);
      }

      this.fastify.log.info({ batchCount: batches.size }, "Processing batches");

      // Process each batch
      for (const [batchKey, notifications] of batches.entries()) {
        try {
          await this.processBatch(batchKey, notifications);
        } catch (error) {
          this.fastify.log.error(
            { error, batchKey },
            "Failed to process batch",
          );
        }
      }

      this.fastify.log.info(
        {
          totalNotifications: unbatchedNotifications.length,
          batchCount: batches.size,
        },
        "Batch processing complete",
      );
    } catch (error) {
      this.fastify.log.error({ error }, "Failed to process batches");
      throw error;
    }
  }

  /**
   * Process a single batch
   */
  private async processBatch(
    batchKey: string,
    notifications: Array<{
      id: string;
      tenantId: string;
      userId: string;
      eventType: NotificationEventType;
      channel: NotificationChannel;
      priority: string;
      subject: string | null;
      body: string;
      templateId: string | null;
      data: string | null;
      batchKey: string;
      isBatched: boolean;
      batchedAt: Date | null;
      createdAt: Date;
    }>,
  ): Promise<void> {
    if (notifications.length === 0) {
      return;
    }

    const firstNotification = notifications[0];
    const { userId, eventType, channel, tenantId } = firstNotification;

    this.fastify.log.info(
      { batchKey, count: notifications.length, userId, eventType, channel },
      "Processing batch",
    );

    try {
      // Get user details
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user || !user.isActive) {
        this.fastify.log.warn(
          { userId },
          "User not found or inactive, skipping batch",
        );
        return;
      }

      // Generate digest message
      const digestSubject = this.generateDigestSubject(
        eventType,
        notifications.length,
      );
      const digestBody = this.generateDigestBody(eventType, notifications);

      // Send digest notification
      await this.sendDigest({
        tenantId,
        userId,
        eventType,
        channel,
        recipient: this.getRecipient(user, channel),
        subject: digestSubject,
        body: digestBody,
      });

      // Mark all notifications in this batch as batched
      for (const notification of notifications) {
        await db
          .update(notificationQueue)
          .set({
            isBatched: true,
            batchedAt: new Date(),
          })
          .where(eq(notificationQueue.id, notification.id));
      }

      this.fastify.log.info(
        { batchKey, count: notifications.length },
        "Batch processed successfully",
      );
    } catch (error) {
      this.fastify.log.error({ error, batchKey }, "Failed to process batch");
      throw error;
    }
  }

  /**
   * Generate digest subject based on event type and count
   */
  private generateDigestSubject(
    eventType: NotificationEventType,
    count: number,
  ): string {
    const eventTypeLabels: Record<NotificationEventType, string> = {
      work_order_assigned: "Work Orders Assigned",
      work_order_overdue: "Work Orders Overdue",
      work_order_completed: "Work Orders Completed",
      alert_critical: "Critical Alerts",
      alert_high: "High Priority Alerts",
      alert_medium: "Medium Priority Alerts",
      alert_acknowledged: "Alerts Acknowledged",
      alert_resolved: "Alerts Resolved",
      asset_down: "Assets Down",
      maintenance_due: "Maintenance Due",
    };

    const label = eventTypeLabels[eventType] || eventType;
    return `You have ${count} new ${label.toLowerCase()}`;
  }

  /**
   * Generate digest body with all notifications
   */
  private generateDigestBody(
    eventType: NotificationEventType,
    notifications: Array<{
      subject: string | null;
      body: string;
      data: string | null;
      createdAt: Date;
    }>,
  ): string {
    let digest = `<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background-color: #f4f4f4; padding: 20px; border-bottom: 3px solid #3498db; }
    .notification { border-left: 4px solid #3498db; padding: 15px; margin: 15px 0; background-color: #f9f9f9; }
    .notification-title { font-weight: bold; color: #2c3e50; margin-bottom: 10px; }
    .notification-time { color: #7f8c8d; font-size: 0.9em; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #7f8c8d; font-size: 0.9em; }
  </style>
</head>
<body>
  <div class="header">
    <h2>Notification Digest - ${notifications.length} Updates</h2>
  </div>
`;

    // Add each notification
    for (const notification of notifications) {
      // const data = JSON.parse(notification.data || "{}");
      const time = new Date(notification.createdAt).toLocaleString();

      digest += `
  <div class="notification">
    <div class="notification-title">${notification.subject || "Notification"}</div>
    <div>${notification.body}</div>
    <div class="notification-time">Received: ${time}</div>
  </div>
`;
    }

    digest += `
  <div class="footer">
    <p>This is a batched notification digest. You received ${notifications.length} notifications for ${eventType}.</p>
    <p>To adjust your notification preferences, log in to your dCMMS account.</p>
  </div>
</body>
</html>`;

    return digest;
  }

  /**
   * Get recipient based on channel
   */
  private getRecipient(
    user: typeof users.$inferSelect,
    channel: NotificationChannel,
  ): string {
    switch (channel) {
      case "email":
        return user.email;
      case "sms":
        return user.phone || "";
      case "push":
        return user.id;
      default:
        return user.email;
    }
  }

  /**
   * Send digest notification
   */
  private async sendDigest(params: {
    tenantId: string;
    userId: string;
    eventType: NotificationEventType;
    channel: NotificationChannel;
    recipient: string;
    subject: string;
    body: string;
  }): Promise<void> {
    const { tenantId, userId, eventType, channel, recipient, subject, body } =
      params;

    // Create notification history record
    const [historyRecord] = await db
      .insert(notificationHistory)
      .values({
        tenantId,
        userId,
        eventType,
        channel,
        recipient,
        subject,
        body,
        status: "pending",
      })
      .returning();

    try {
      switch (channel) {
        case "email":
          await this.sendEmail(recipient, subject, body, historyRecord.id);
          break;
        case "sms":
          await this.sendSMS(recipient, subject, historyRecord.id);
          break;
        case "push":
          await this.sendPushNotification(
            userId,
            subject,
            body,
            historyRecord.id,
          );
          break;
        default:
          this.fastify.log.warn({ channel }, "Unsupported channel for digest");
      }
    } catch (error) {
      this.fastify.log.error(
        { error, channel, recipient },
        "Failed to send digest",
      );
      await this.updateNotificationStatus(historyRecord.id, "failed", error);
    }
  }

  /**
   * Send email digest
   */
  private async sendEmail(
    to: string,
    subject: string,
    body: string,
    historyId: string,
  ): Promise<void> {
    try {
      const { createEmailProviderService } =
        await import("./email-provider.service");
      const emailProvider = createEmailProviderService(this.fastify);

      const result = await emailProvider.send({
        to,
        subject,
        html: body,
      });

      if (result.status === "sent") {
        await this.updateNotificationStatus(historyId, "sent");
        this.fastify.log.info(
          { to, messageId: result.messageId },
          "Digest email sent",
        );
      } else {
        throw new Error(result.error || "Failed to send digest email");
      }
    } catch (error) {
      this.fastify.log.error({ error, to }, "Failed to send digest email");
      await this.updateNotificationStatus(historyId, "failed", error);
      throw error;
    }
  }

  /**
   * Send SMS digest (short summary)
   */
  private async sendSMS(
    to: string,
    message: string,
    historyId: string,
  ): Promise<void> {
    try {
      const { createSMSProviderService } =
        await import("./sms-provider.service");
      const smsProvider = createSMSProviderService(this.fastify);

      const result = await smsProvider.send({
        to,
        body: message,
      });

      if (result.status === "sent") {
        await this.updateNotificationStatus(historyId, "sent");
        this.fastify.log.info(
          { to, messageId: result.messageId },
          "Digest SMS sent",
        );
      } else {
        throw new Error(result.error || "Failed to send digest SMS");
      }
    } catch (error) {
      this.fastify.log.error({ error, to }, "Failed to send digest SMS");
      await this.updateNotificationStatus(historyId, "failed", error);
      throw error;
    }
  }

  /**
   * Send push notification digest
   */
  private async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    historyId: string,
  ): Promise<void> {
    try {
      const { createPushNotificationService } =
        await import("./push-notification.service");
      const pushService = createPushNotificationService(this.fastify);

      const result = await pushService.send({
        userId,
        title,
        body,
        data: {
          historyId,
          type: "digest",
          timestamp: new Date().toISOString(),
        },
      });

      if (result.status === "sent" && (result.successCount || 0) > 0) {
        await this.updateNotificationStatus(historyId, "sent");
        this.fastify.log.info(
          { userId, messageId: result.messageId },
          "Digest push sent",
        );
      } else {
        throw new Error(
          result.error || "Failed to send digest push notification",
        );
      }
    } catch (error) {
      this.fastify.log.error({ error, userId }, "Failed to send digest push");
      await this.updateNotificationStatus(historyId, "failed", error);
      throw error;
    }
  }

  /**
   * Update notification history status
   */
  private async updateNotificationStatus(
    historyId: string,
    status: "sent" | "delivered" | "failed",
    error?: unknown,
  ): Promise<void> {
    const updateData: Partial<typeof notificationHistory.$inferSelect> = {
      status,
      updatedAt: new Date(),
    };

    if (status === "sent") {
      updateData.sentAt = new Date();
    } else if (status === "delivered") {
      updateData.deliveredAt = new Date();
    } else if (status === "failed") {
      updateData.failedAt = new Date();
      if (error instanceof Error) {
        updateData.errorMessage = error.message;
      } else {
        updateData.errorMessage = String(error) || "Unknown error";
      }
    }

    await db
      .update(notificationHistory)
      .set(updateData)
      .where(eq(notificationHistory.id, historyId));
  }

  /**
   * Clean up old batched notifications (older than 30 days)
   */
  async cleanup(): Promise<void> {
    this.fastify.log.info("Cleaning up old batched notifications");

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);

      await db
        .delete(notificationQueue)
        .where(
          and(
            eq(notificationQueue.isBatched, true),
            lte(notificationQueue.batchedAt, cutoffDate),
          ),
        );

      this.fastify.log.info("Old batched notifications cleaned up");
    } catch (error) {
      this.fastify.log.error({ error }, "Failed to clean up old notifications");
    }
  }
}

export function createNotificationBatchingService(
  fastify: FastifyInstance,
): NotificationBatchingService {
  return new NotificationBatchingService(fastify);
}
