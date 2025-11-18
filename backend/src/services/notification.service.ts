import { db } from '../db';
import {
  notificationHistory,
  notificationPreferences,
  notificationRules,
  notificationTemplates,
  deviceTokens,
  users,
} from '../db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { FastifyInstance } from 'fastify';

export type NotificationChannel = 'email' | 'sms' | 'push' | 'webhook' | 'slack';
export type NotificationEventType =
  | 'work_order_assigned'
  | 'work_order_overdue'
  | 'work_order_completed'
  | 'alert_critical'
  | 'alert_high'
  | 'alert_medium'
  | 'alert_acknowledged'
  | 'alert_resolved'
  | 'asset_down'
  | 'maintenance_due';

export interface NotificationPayload {
  tenantId: string;
  userId: string;
  eventType: NotificationEventType;
  data: Record<string, any>;
  severity?: 'critical' | 'high' | 'medium' | 'low';
}

export interface TemplateVariables {
  asset_name?: string;
  wo_id?: string;
  alarm_severity?: string;
  value?: string;
  threshold?: string;
  site_name?: string;
  assigned_to?: string;
  priority?: string;
  [key: string]: any;
}

export class NotificationService {
  private fastify: FastifyInstance;
  private rateLimitMap: Map<string, { count: number; resetAt: number }> = new Map();
  private readonly MAX_EMAILS_PER_MINUTE = 10;
  private readonly MAX_SMS_PER_MINUTE = 5;
  private readonly RATE_LIMIT_WINDOW_MS = 60000; // 1 minute

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

  /**
   * Send notification based on event type and user preferences
   */
  async sendNotification(payload: NotificationPayload): Promise<void> {
    const { tenantId, userId, eventType, data } = payload;

    this.fastify.log.info({ payload }, 'Sending notification');

    try {
      // Get user details
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user || !user.isActive) {
        this.fastify.log.warn({ userId }, 'User not found or inactive');
        return;
      }

      // Get notification rules for this event type
      const rules = await this.getNotificationRules(tenantId, eventType);

      if (rules.length === 0) {
        this.fastify.log.info({ eventType }, 'No notification rules found for event type');
        return;
      }

      // Get user preferences
      const preferences = await this.getUserPreferences(userId);

      // Send notifications through enabled channels
      for (const rule of rules) {
        const channels = JSON.parse(rule.channels) as NotificationChannel[];

        for (const channel of channels) {
          // Check if user has this channel enabled
          const pref = preferences.find(
            (p) => p.eventType === eventType && p.channel === channel
          );

          if (pref && !pref.isEnabled) {
            this.fastify.log.info(
              { userId, channel, eventType },
              'User has disabled this notification channel'
            );
            continue;
          }

          // Check quiet hours
          if (pref && this.isInQuietHours(pref)) {
            this.fastify.log.info({ userId, channel }, 'User is in quiet hours');
            continue;
          }

          // Check rate limits
          if (!this.checkRateLimit(userId, channel)) {
            this.fastify.log.warn({ userId, channel }, 'Rate limit exceeded');
            continue;
          }

          // Get template
          const template = await this.getTemplate(tenantId, eventType, channel);

          if (!template) {
            this.fastify.log.warn({ eventType, channel }, 'No template found');
            continue;
          }

          // Render template
          const rendered = this.renderTemplate(template.bodyTemplate, data);
          const subject = template.subject
            ? this.renderTemplate(template.subject, data)
            : undefined;

          // Send notification
          await this.sendToChannel({
            channel,
            userId,
            tenantId,
            eventType,
            recipient: this.getRecipient(user, channel),
            subject,
            body: rendered,
            templateId: template.id,
          });
        }
      }
    } catch (error) {
      this.fastify.log.error({ error, payload }, 'Failed to send notification');
      throw error;
    }
  }

  /**
   * Get notification rules for event type
   */
  private async getNotificationRules(
    tenantId: string,
    eventType: NotificationEventType
  ) {
    return db.query.notificationRules.findMany({
      where: and(
        eq(notificationRules.tenantId, tenantId),
        eq(notificationRules.eventType, eventType),
        eq(notificationRules.isActive, true)
      ),
    });
  }

  /**
   * Get user notification preferences
   */
  private async getUserPreferences(userId: string) {
    return db.query.notificationPreferences.findMany({
      where: eq(notificationPreferences.userId, userId),
    });
  }

  /**
   * Get notification template
   */
  private async getTemplate(
    tenantId: string,
    eventType: NotificationEventType,
    channel: NotificationChannel
  ) {
    return db.query.notificationTemplates.findFirst({
      where: and(
        eq(notificationTemplates.tenantId, tenantId),
        eq(notificationTemplates.eventType, eventType),
        eq(notificationTemplates.channel, channel),
        eq(notificationTemplates.isActive, true)
      ),
    });
  }

  /**
   * Render template with variables
   */
  private renderTemplate(template: string, variables: TemplateVariables): string {
    let rendered = template;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      rendered = rendered.replace(regex, String(value || ''));
    }

    return rendered;
  }

  /**
   * Check if user is in quiet hours
   */
  private isInQuietHours(pref: any): boolean {
    if (!pref.quietHoursStart || !pref.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;

    return currentTime >= pref.quietHoursStart && currentTime <= pref.quietHoursEnd;
  }

  /**
   * Check rate limit for user and channel
   */
  private checkRateLimit(userId: string, channel: NotificationChannel): boolean {
    const key = `${userId}:${channel}`;
    const now = Date.now();

    const limit =
      channel === 'email'
        ? this.MAX_EMAILS_PER_MINUTE
        : channel === 'sms'
          ? this.MAX_SMS_PER_MINUTE
          : 100; // Higher limit for push

    const entry = this.rateLimitMap.get(key);

    if (!entry || entry.resetAt < now) {
      this.rateLimitMap.set(key, {
        count: 1,
        resetAt: now + this.RATE_LIMIT_WINDOW_MS,
      });
      return true;
    }

    if (entry.count >= limit) {
      return false;
    }

    entry.count++;
    return true;
  }

  /**
   * Get recipient based on channel
   */
  private getRecipient(user: any, channel: NotificationChannel): string {
    switch (channel) {
      case 'email':
        return user.email;
      case 'sms':
        return user.phone || '';
      case 'push':
        return user.id; // Will use device tokens
      default:
        return user.email;
    }
  }

  /**
   * Send notification to specific channel
   */
  private async sendToChannel(params: {
    channel: NotificationChannel;
    userId: string;
    tenantId: string;
    eventType: NotificationEventType;
    recipient: string;
    subject?: string;
    body: string;
    templateId: string;
  }): Promise<void> {
    const {
      channel,
      userId,
      tenantId,
      eventType,
      recipient,
      subject,
      body,
      templateId,
    } = params;

    // Create notification history record
    const [historyRecord] = await db
      .insert(notificationHistory)
      .values({
        tenantId,
        userId,
        eventType,
        channel,
        templateId,
        recipient,
        subject,
        body,
        status: 'pending',
      })
      .returning();

    try {
      switch (channel) {
        case 'email':
          await this.sendEmail(recipient, subject || '', body, historyRecord.id);
          break;
        case 'sms':
          await this.sendSMS(recipient, body, historyRecord.id);
          break;
        case 'push':
          await this.sendPushNotification(userId, subject || '', body, historyRecord.id);
          break;
        default:
          this.fastify.log.warn({ channel }, 'Unsupported channel');
      }
    } catch (error) {
      this.fastify.log.error({ error, channel, recipient }, 'Failed to send to channel');
      await this.updateNotificationStatus(historyRecord.id, 'failed', error);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmail(
    to: string,
    subject: string,
    body: string,
    historyId: string
  ): Promise<void> {
    this.fastify.log.info({ to, subject }, 'Sending email notification');

    try {
      // Import email provider dynamically
      const { createEmailProviderService } = await import('./email-provider.service');
      const emailProvider = createEmailProviderService(this.fastify);

      // Send email
      const result = await emailProvider.send({
        to,
        subject,
        html: body,
      });

      if (result.status === 'sent') {
        await this.updateNotificationStatus(historyId, 'sent');
        this.fastify.log.info({ to, messageId: result.messageId }, 'Email sent successfully');
      } else {
        throw new Error(result.error || 'Failed to send email');
      }
    } catch (error) {
      this.fastify.log.error({ error, to }, 'Failed to send email');
      await this.updateNotificationStatus(historyId, 'failed', error);
      throw error;
    }
  }

  /**
   * Send SMS notification
   */
  private async sendSMS(to: string, body: string, historyId: string): Promise<void> {
    this.fastify.log.info({ to, body }, 'Sending SMS notification');

    try {
      // Import SMS provider dynamically
      const { createSMSProviderService } = await import('./sms-provider.service');
      const smsProvider = createSMSProviderService(this.fastify);

      // Check if user has opted out
      const hasOptedOut = await smsProvider.checkOptOut(to);
      if (hasOptedOut) {
        this.fastify.log.warn({ to }, 'User has opted out of SMS notifications');
        await this.updateNotificationStatus(historyId, 'failed', new Error('User opted out'));
        return;
      }

      // Send SMS
      const result = await smsProvider.send({
        to,
        body,
      });

      if (result.status === 'sent') {
        await this.updateNotificationStatus(historyId, 'sent');
        this.fastify.log.info(
          { to, messageId: result.messageId, cost: result.cost },
          'SMS sent successfully'
        );
      } else {
        throw new Error(result.error || 'Failed to send SMS');
      }
    } catch (error) {
      this.fastify.log.error({ error, to }, 'Failed to send SMS');
      await this.updateNotificationStatus(historyId, 'failed', error);
      throw error;
    }
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    historyId: string
  ): Promise<void> {
    this.fastify.log.info({ userId, title, body }, 'Sending push notification');

    try {
      // Import push notification provider dynamically
      const { createPushNotificationService } = await import('./push-notification.service');
      const pushService = createPushNotificationService(this.fastify);

      // Send push notification
      const result = await pushService.send({
        userId,
        title,
        body,
        data: {
          historyId,
          timestamp: new Date().toISOString(),
        },
      });

      if (result.status === 'sent' && (result.successCount || 0) > 0) {
        await this.updateNotificationStatus(historyId, 'sent');
        this.fastify.log.info(
          {
            userId,
            messageId: result.messageId,
            successCount: result.successCount,
            failureCount: result.failureCount,
          },
          'Push notification sent successfully'
        );
      } else {
        throw new Error(result.error || 'Failed to send push notification');
      }
    } catch (error) {
      this.fastify.log.error({ error, userId }, 'Failed to send push notification');
      await this.updateNotificationStatus(historyId, 'failed', error);
      throw error;
    }
  }

  /**
   * Update notification history status
   */
  private async updateNotificationStatus(
    historyId: string,
    status: 'sent' | 'delivered' | 'failed',
    error?: any
  ): Promise<void> {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'sent') {
      updateData.sentAt = new Date();
    } else if (status === 'delivered') {
      updateData.deliveredAt = new Date();
    } else if (status === 'failed') {
      updateData.failedAt = new Date();
      updateData.errorMessage = error?.message || 'Unknown error';
    }

    await db
      .update(notificationHistory)
      .set(updateData)
      .where(eq(notificationHistory.id, historyId));
  }

  /**
   * Retry failed notifications with exponential backoff
   */
  async retryFailedNotifications(): Promise<void> {
    const failedNotifications = await db.query.notificationHistory.findMany({
      where: and(
        eq(notificationHistory.status, 'failed'),
        eq(notificationHistory.retryCount, 0) // Only retry once for now
      ),
      limit: 100,
    });

    for (const notification of failedNotifications) {
      try {
        await this.sendToChannel({
          channel: notification.channel as NotificationChannel,
          userId: notification.userId,
          tenantId: notification.tenantId,
          eventType: notification.eventType as NotificationEventType,
          recipient: notification.recipient,
          subject: notification.subject || undefined,
          body: notification.body,
          templateId: notification.templateId || '',
        });

        // Increment retry count
        await db
          .update(notificationHistory)
          .set({
            retryCount: notification.retryCount + 1,
            updatedAt: new Date(),
          })
          .where(eq(notificationHistory.id, notification.id));
      } catch (error) {
        this.fastify.log.error({ error, notification }, 'Retry failed');
      }
    }
  }
}

export function createNotificationService(fastify: FastifyInstance): NotificationService {
  return new NotificationService(fastify);
}
