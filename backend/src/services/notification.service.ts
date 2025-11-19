/**
 * Notification Service (DCMMS-063)
 *
 * Core notification system with:
 * - Template rendering (Handlebars)
 * - Rule engine
 * - Priority queue
 * - Rate limiting
 * - Retry logic with exponential backoff
 * - Multi-channel support (email, SMS, push)
 *
 * Usage:
 *   const notificationService = new NotificationService(db);
 *   await notificationService.sendNotification({
 *     templateCode: 'alarm_critical',
 *     userId: '123',
 *     channels: ['email', 'sms'],
 *     variables: { asset_name: 'Pump #1', value: 85, unit: '°C' }
 *   });
 */

import Handlebars from 'handlebars';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import WebhookService from './webhook.service';

// ==========================================
// Types
// ==========================================

export interface NotificationTemplate {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  subject?: string;
  body_text: string;
  body_html?: string;
  variables: string[];
  category: string;
  enabled: boolean;
}

export interface NotificationRule {
  id: string;
  tenant_id: string;
  name: string;
  enabled: boolean;
  trigger_conditions: Record<string, any>;
  template_code: string;
  channels: string[];
  recipient_type: 'user' | 'role' | 'dynamic';
  recipient_ids?: string[];
  recipient_dynamic?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  rate_limit_count: number;
  rate_limit_period_seconds: number;
  escalation_enabled: boolean;
  escalation_delay_minutes?: number;
  escalation_recipient_ids?: string[];
}

export interface NotificationRequest {
  tenantId: string;
  templateCode: string;
  userId: string;
  channels: ('email' | 'sms' | 'push')[];
  variables: Record<string, any>;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  scheduledAt?: Date;
  metadata?: Record<string, any>;
  ruleId?: string;
}

export interface QueuedNotification {
  id: string;
  tenant_id: string;
  user_id: string;
  channel: string;
  template_code: string;
  subject?: string;
  body: string;
  priority: string;
  status: string;
  scheduled_at: Date;
  retry_count: number;
  max_retries: number;
  metadata?: Record<string, any>;
}

// ==========================================
// Notification Service
// ==========================================

export class NotificationService {
  private db: Pool;
  private templateCache: Map<string, Handlebars.TemplateDelegate> = new Map();
  private webhookService: WebhookService;

  constructor(db: Pool) {
    this.db = db;
    this.webhookService = new WebhookService();
    this.registerHandlebarsHelpers();
  }

  /**
   * Register custom Handlebars helpers
   */
  private registerHandlebarsHelpers() {
    // Date formatting helper
    Handlebars.registerHelper('formatDate', (date: string | Date, format: string) => {
      const d = new Date(date);
      if (format === 'short') {
        return d.toLocaleDateString();
      } else if (format === 'long') {
        return d.toLocaleString();
      }
      return d.toISOString();
    });

    // Currency formatting helper
    Handlebars.registerHelper('formatCurrency', (value: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(value);
    });

    // Uppercase helper
    Handlebars.registerHelper('uppercase', (str: string) => {
      return str ? str.toUpperCase() : '';
    });

    // Conditional helper
    Handlebars.registerHelper('eq', (a: any, b: any) => {
      return a === b;
    });
  }

  /**
   * Send notification to specified channels
   */
  async sendNotification(request: NotificationRequest): Promise<string[]> {
    const {
      tenantId,
      templateCode,
      userId,
      channels,
      variables,
      priority = 'medium',
      scheduledAt = new Date(),
      metadata,
      ruleId,
    } = request;

    // Validate inputs
    if (!tenantId || !templateCode || !userId || !channels || channels.length === 0) {
      throw new Error('Missing required notification parameters');
    }

    // Get template
    const template = await this.getTemplate(tenantId, templateCode);
    if (!template) {
      throw new Error(`Template not found: ${templateCode}`);
    }

    // Validate template variables
    this.validateTemplateVariables(template, variables);

    // Check rate limits for each channel
    const allowedChannels: string[] = [];
    for (const channel of channels) {
      const allowed = await this.checkRateLimit(tenantId, userId, channel);
      if (allowed) {
        allowedChannels.push(channel);
      } else {
        console.warn(`Rate limit exceeded for user ${userId} on channel ${channel}`);
      }
    }

    if (allowedChannels.length === 0) {
      throw new Error('All channels rate limited');
    }

    // Queue notifications for each allowed channel
    const notificationIds: string[] = [];

    for (const channel of allowedChannels) {
      // Render template
      const { subject, body } = await this.renderTemplate(template, variables, channel);

      // Queue notification
      const notificationId = await this.queueNotification({
        tenantId,
        userId,
        channel,
        templateCode,
        subject,
        body,
        priority,
        scheduledAt,
        metadata,
        ruleId,
        variables,
      });

      notificationIds.push(notificationId);

      // Update rate limit
      await this.incrementRateLimit(tenantId, userId, channel);
    }

    // Trigger webhooks (asynchronously, don't wait)
    this.triggerWebhooksAsync(tenantId, templateCode, {
      notificationIds,
      userId,
      channels: allowedChannels,
      variables,
      metadata,
    }).catch((error) => {
      console.error('Error triggering webhooks:', error);
    });

    return notificationIds;
  }

  /**
   * Get notification template from database (with caching)
   */
  private async getTemplate(tenantId: string, code: string): Promise<NotificationTemplate | null> {
    const result = await this.db.query(
      `SELECT * FROM notification_templates
       WHERE tenant_id = $1 AND code = $2 AND enabled = true`,
      [tenantId, code]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  /**
   * Validate that all required template variables are provided
   */
  private validateTemplateVariables(template: NotificationTemplate, variables: Record<string, any>) {
    const requiredVars = template.variables || [];
    const missingVars = requiredVars.filter((v: string) => !(v in variables));

    if (missingVars.length > 0) {
      throw new Error(`Missing required template variables: ${missingVars.join(', ')}`);
    }
  }

  /**
   * Render template with variables using Handlebars
   */
  private async renderTemplate(
    template: NotificationTemplate,
    variables: Record<string, any>,
    channel: string
  ): Promise<{ subject?: string; body: string }> {
    // Compile templates (use cache if available)
    const subjectCacheKey = `${template.id}:subject`;
    const bodyCacheKey = `${template.id}:body:${channel}`;

    let subjectTemplate: Handlebars.TemplateDelegate | undefined;
    let bodyTemplate: Handlebars.TemplateDelegate;

    // Subject (email only)
    if (template.subject) {
      if (!this.templateCache.has(subjectCacheKey)) {
        this.templateCache.set(subjectCacheKey, Handlebars.compile(template.subject));
      }
      subjectTemplate = this.templateCache.get(subjectCacheKey);
    }

    // Body
    if (!this.templateCache.has(bodyCacheKey)) {
      const bodySource = channel === 'email' && template.body_html ? template.body_html : template.body_text;
      this.templateCache.set(bodyCacheKey, Handlebars.compile(bodySource));
    }
    bodyTemplate = this.templateCache.get(bodyCacheKey)!;

    // Render
    const subject = subjectTemplate ? subjectTemplate(variables) : undefined;
    const body = bodyTemplate(variables);

    return { subject, body };
  }

  /**
   * Queue notification for delivery
   */
  private async queueNotification(params: {
    tenantId: string;
    userId: string;
    channel: string;
    templateCode: string;
    subject?: string;
    body: string;
    priority: string;
    scheduledAt: Date;
    metadata?: Record<string, any>;
    ruleId?: string;
    variables: Record<string, any>;
  }): Promise<string> {
    const id = uuidv4();

    await this.db.query(
      `INSERT INTO notification_queue
       (id, tenant_id, notification_rule_id, user_id, channel, template_code,
        subject, body, template_variables, priority, status, scheduled_at, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        id,
        params.tenantId,
        params.ruleId || null,
        params.userId,
        params.channel,
        params.templateCode,
        params.subject || null,
        params.body,
        JSON.stringify(params.variables),
        params.priority,
        'pending',
        params.scheduledAt,
        params.metadata ? JSON.stringify(params.metadata) : null,
      ]
    );

    return id;
  }

  /**
   * Check if user has exceeded rate limit for channel
   */
  private async checkRateLimit(tenantId: string, userId: string, channel: string): Promise<boolean> {
    // Get default rate limit (can be customized per user/tenant)
    const rateLimit = 10; // Max 10 notifications
    const periodSeconds = 60; // Per 60 seconds

    const windowStart = new Date(Date.now() - periodSeconds * 1000);
    const windowEnd = new Date();

    // Count notifications in current window
    const result = await this.db.query(
      `SELECT COALESCE(SUM(notification_count), 0) as count
       FROM notification_rate_limits
       WHERE tenant_id = $1 AND user_id = $2 AND channel = $3
         AND window_end > $4`,
      [tenantId, userId, channel, windowStart]
    );

    const currentCount = parseInt(result.rows[0]?.count || '0');

    return currentCount < rateLimit;
  }

  /**
   * Increment rate limit counter
   */
  private async incrementRateLimit(tenantId: string, userId: string, channel: string) {
    const windowSize = 60; // 60 seconds
    const windowStart = new Date();
    windowStart.setSeconds(0, 0); // Align to minute boundary
    const windowEnd = new Date(windowStart.getTime() + windowSize * 1000);

    await this.db.query(
      `INSERT INTO notification_rate_limits
       (tenant_id, user_id, channel, window_start, window_end, notification_count)
       VALUES ($1, $2, $3, $4, $5, 1)
       ON CONFLICT (tenant_id, user_id, channel, window_start)
       DO UPDATE SET
         notification_count = notification_rate_limits.notification_count + 1,
         updated_at = NOW()`,
      [tenantId, userId, channel, windowStart, windowEnd]
    );
  }

  /**
   * Get pending notifications from queue (for worker to process)
   */
  async getPendingNotifications(limit: number = 100): Promise<QueuedNotification[]> {
    const result = await this.db.query(
      `SELECT * FROM notification_queue
       WHERE status = 'pending'
         AND scheduled_at <= NOW()
       ORDER BY
         CASE priority
           WHEN 'critical' THEN 1
           WHEN 'high' THEN 2
           WHEN 'medium' THEN 3
           WHEN 'low' THEN 4
         END,
         scheduled_at
       LIMIT $1`,
      [limit]
    );

    return result.rows;
  }

  /**
   * Mark notification as processing
   */
  async markAsProcessing(notificationId: string): Promise<void> {
    await this.db.query(
      `UPDATE notification_queue
       SET status = 'processing', updated_at = NOW()
       WHERE id = $1`,
      [notificationId]
    );
  }

  /**
   * Mark notification as sent
   */
  async markAsSent(notificationId: string, providerMessageId?: string): Promise<void> {
    await this.db.query(
      `UPDATE notification_queue
       SET status = 'sent', sent_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [notificationId]
    );

    // Record in history
    const notification = await this.db.query(
      `SELECT * FROM notification_queue WHERE id = $1`,
      [notificationId]
    );

    if (notification.rows.length > 0) {
      const n = notification.rows[0];
      await this.recordHistory(n, 'sent', providerMessageId);
    }
  }

  /**
   * Mark notification as failed (with retry logic)
   */
  async markAsFailed(notificationId: string, error: string): Promise<void> {
    const result = await this.db.query(
      `UPDATE notification_queue
       SET
         status = CASE
           WHEN retry_count < max_retries THEN 'failed'
           ELSE 'cancelled'
         END,
         retry_count = retry_count + 1,
         next_retry_at = CASE
           WHEN retry_count < max_retries THEN NOW() + (INTERVAL '1 minute' * POWER(2, retry_count))
           ELSE NULL
         END,
         error_message = $2,
         failed_at = NOW(),
         updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [notificationId, error]
    );

    if (result.rows.length > 0) {
      const n = result.rows[0];
      await this.recordHistory(n, 'failed', null, error);
    }
  }

  /**
   * Record notification in history
   */
  private async recordHistory(
    notification: QueuedNotification,
    status: string,
    providerMessageId?: string,
    errorMessage?: string
  ): Promise<void> {
    // Get user details
    const userResult = await this.db.query(
      `SELECT email, phone FROM users WHERE id = $1`,
      [notification.user_id]
    );

    const user = userResult.rows[0];

    await this.db.query(
      `INSERT INTO notification_history
       (tenant_id, notification_rule_id, notification_queue_id, user_id, user_email, user_phone,
        channel, template_code, subject, body, status, provider_message_id, sent_at, error_message, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), $13, $14)`,
      [
        notification.tenant_id,
        null, // Will be populated if from rule
        notification.id,
        notification.user_id,
        user?.email,
        user?.phone,
        notification.channel,
        notification.template_code,
        notification.subject,
        notification.body,
        status,
        providerMessageId,
        errorMessage,
        notification.metadata ? JSON.stringify(notification.metadata) : null,
      ]
    );
  }

  /**
   * Evaluate notification rules for an event
   */
  async evaluateRules(tenantId: string, eventType: string, eventData: Record<string, any>): Promise<NotificationRule[]> {
    const result = await this.db.query(
      `SELECT * FROM notification_rules
       WHERE tenant_id = $1 AND enabled = true`,
      [tenantId]
    );

    const matchingRules: NotificationRule[] = [];

    for (const rule of result.rows) {
      if (this.ruleMatches(rule, eventType, eventData)) {
        matchingRules.push(rule);
      }
    }

    return matchingRules;
  }

  /**
   * Check if rule conditions match the event
   */
  private ruleMatches(rule: NotificationRule, eventType: string, eventData: Record<string, any>): boolean {
    const conditions = rule.trigger_conditions;

    // Check event type
    if (conditions.event_type && conditions.event_type !== eventType) {
      return false;
    }

    // Check severity (for alarms)
    if (conditions.severity && Array.isArray(conditions.severity)) {
      if (!conditions.severity.includes(eventData.severity)) {
        return false;
      }
    }

    // Check sensor type (for alarms)
    if (conditions.sensor_type && Array.isArray(conditions.sensor_type)) {
      if (!conditions.sensor_type.includes(eventData.sensor_type)) {
        return false;
      }
    }

    // Check priority (for work orders)
    if (conditions.priority && Array.isArray(conditions.priority)) {
      if (!conditions.priority.includes(eventData.priority)) {
        return false;
      }
    }

    // All conditions matched
    return true;
  }

  /**
   * Resolve dynamic recipients (e.g., "asset_owner", "wo_assignee")
   */
  async resolveDynamicRecipients(recipientType: string, eventData: Record<string, any>): Promise<string[]> {
    const userIds: string[] = [];

    if (recipientType === 'asset_owner') {
      // Get asset owner from assets table
      if (eventData.asset_id) {
        const result = await this.db.query(
          `SELECT owner_id FROM assets WHERE id = $1`,
          [eventData.asset_id]
        );
        if (result.rows[0]?.owner_id) {
          userIds.push(result.rows[0].owner_id);
        }
      }
    } else if (recipientType === 'wo_assignee') {
      // Get work order assignee
      if (eventData.work_order_id) {
        const result = await this.db.query(
          `SELECT assigned_to FROM work_orders WHERE id = $1`,
          [eventData.work_order_id]
        );
        if (result.rows[0]?.assigned_to) {
          userIds.push(result.rows[0].assigned_to);
        }
      }
    } else if (recipientType === 'supervisor') {
      // Get user's supervisor
      if (eventData.user_id) {
        const result = await this.db.query(
          `SELECT supervisor_id FROM users WHERE id = $1`,
          [eventData.user_id]
        );
        if (result.rows[0]?.supervisor_id) {
          userIds.push(result.rows[0].supervisor_id);
        }
      }
    }

    return userIds;
  }

  /**
   * Trigger webhooks for notification event (async, non-blocking)
   */
  private async triggerWebhooksAsync(
    tenantId: string,
    eventType: string,
    eventData: Record<string, any>
  ): Promise<void> {
    try {
      await this.webhookService.triggerWebhooks(tenantId, eventType, eventData);
    } catch (error) {
      // Log but don't throw - webhooks should not block notifications
      console.error(`Webhook trigger failed for event ${eventType}:`, error);
    }
  }
}

export default NotificationService;
