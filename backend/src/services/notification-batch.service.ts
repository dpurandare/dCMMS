/**
 * Notification Batching Service (DCMMS-073)
 *
 * Batch low/medium priority notifications into daily/weekly digests
 * to reduce notification fatigue.
 *
 * Features:
 * - Configurable batching per user (daily/weekly)
 * - Priority-based filtering
 * - Grouped digest emails
 * - Scheduled sending
 *
 * Usage:
 *   const batchService = new NotificationBatchService(db);
 *   await batchService.processScheduledDigests(); // Run via cron
 */

import { Pool } from "pg";
import { randomUUID } from "crypto";
import EmailService from "./email.service";

// ==========================================
// Types
// ==========================================

export interface BatchConfig {
  id: string;
  userId: string;
  enabled: boolean;
  frequency: "daily" | "weekly";
  sendTime: string;
  sendDayOfWeek?: number;
  timezone: string;
  batchPriorities: string[];
  channels: string[];
  eventTypes?: string[];
  lastSentAt?: Date;
  nextSendAt?: Date;
}

export interface DigestConfig extends BatchConfig {
  email: string;
  firstName: string;
  lastName: string;
}

export interface BatchItem {
  id: string;
  eventType: string;
  priority: string;
  subject?: string;
  body: string;
  variables: Record<string, unknown>;
  batchGroup?: string;
  createdAt: Date;
}

export interface DigestContent {
  userId: string;
  periodStart: Date;
  periodEnd: Date;
  totalNotifications: number;
  groups: Record<string, BatchItem[]>;
}

// ==========================================
// Notification Batch Service
// ==========================================

export class NotificationBatchService {
  private db: Pool;
  private emailService: EmailService;

  constructor(db: Pool) {
    this.db = db;
    this.emailService = new EmailService();
  }

  /**
   * Check if notification should be batched
   */
  async shouldBatch(
    userId: string,
    priority: string,
    channel: string,
    eventType: string,
  ): Promise<boolean> {
    const result = await this.db.query(
      "SELECT should_batch_notification($1, $2, $3, $4) AS should_batch",
      [userId, priority, channel, eventType],
    );

    return result.rows[0]?.should_batch || false;
  }

  /**
   * Add notification to batch queue
   */

  async addToBatch(params: {
    userId: string;
    notificationId?: string;
    eventType: string;
    priority: string;
    channel: string;
    subject?: string;
    body: string;
    variables: Record<string, unknown>;
    batchGroup?: string;
  }): Promise<string> {
    const {
      userId,
      notificationId,
      eventType,
      priority,
      channel,
      subject,
      body,
      variables,
      batchGroup,
    } = params;

    // Auto-determine batch group if not provided
    const group = batchGroup || this.determineBatchGroup(eventType);

    const result = await this.db.query(
      `
      INSERT INTO notification_batch_items (
        user_id,
        notification_id,
        event_type,
        priority,
        channel,
        subject,
        body,
        variables,
        batch_group
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `,
      [
        userId,
        notificationId,
        eventType,
        priority,
        channel,
        subject,
        body,
        JSON.stringify(variables),
        group,
      ],
    );

    const batchItemId = result.rows[0].id;
    console.log(
      `Added notification to batch queue: ${batchItemId} (user: ${userId}, group: ${group})`,
    );

    return batchItemId;
  }

  /**
   * Determine batch group based on event type
   */
  private determineBatchGroup(eventType: string): string {
    if (eventType.startsWith("alarm_")) return "alarms";
    if (eventType.startsWith("work_order_")) return "work_orders";
    if (eventType.startsWith("inventory_")) return "inventory";
    if (eventType.startsWith("asset_")) return "assets";
    return "general";
  }

  // ...

  /**
   * Process all scheduled digests due for sending
   */
  async processScheduledDigests(): Promise<number> {
    const result = await this.db.query(
      `
      SELECT
        c.id,
        c.user_id AS "userId",
        c.enabled,
        c.frequency,
        c.send_time AS "sendTime",
        c.send_day_of_week AS "sendDayOfWeek",
        c.timezone,
        c.batch_priorities AS "batchPriorities",
        c.channels,
        c.event_types AS "eventTypes",
        c.last_sent_at AS "lastSentAt",
        c.next_send_at AS "nextSendAt",
        u.email,
        u.first_name AS "firstName",
        u.last_name AS "lastName"
      FROM notification_batch_config c
      JOIN users u ON c.user_id = u.id
      WHERE
        c.enabled = true
        AND c.next_send_at <= NOW()
    `,
    );

    const configs: DigestConfig[] = result.rows;
    console.log(`Found ${configs.length} scheduled digests to process`);

    let sentCount = 0;
    for (const config of configs) {
      try {
        await this.sendDigest(config);
        sentCount++;
      } catch (error) {
        console.error(
          `Failed to process digest for user ${config.userId}:`,
          error,
        );
      }
    }

    return sentCount;
  }

  // ...

  /**
   * Send digest to user
   */
  private async sendDigest(config: DigestConfig): Promise<void> {
    const userId = config.userId;
    const frequency = config.frequency;

    // Determine period
    const periodEnd = new Date();
    const periodStart = new Date();

    if (frequency === "daily") {
      periodStart.setDate(periodStart.getDate() - 1);
    } else if (frequency === "weekly") {
      periodStart.setDate(periodStart.getDate() - 7);
    }

    // Get pending batch items
    const itemsResult = await this.db.query(
      "SELECT * FROM get_pending_batch_items($1, $2)",
      [userId, periodStart],
    );

    const items: BatchItem[] = itemsResult.rows;

    if (items.length === 0) {
      console.log(`No pending items for user ${userId}, skipping digest`);
      // Update next send time anyway
      await this.updateNextSendTime(
        config.id,
        frequency,
        config.sendTime,
        config.sendDayOfWeek,
        config.timezone,
      );
      return;
    }

    // Build digest content
    const digest = this.buildDigest(userId, periodStart, periodEnd, items);

    // Send digest email
    if (config.channels.includes("email")) {
      await this.sendDigestEmail(config.email, config.firstName, digest);
    }

    // Mark items as batched
    const batchId = randomUUID();
    const itemIds = items.map((item) => item.id);

    await this.db.query("SELECT mark_batch_items_sent($1, $2)", [
      itemIds,
      batchId,
    ]);

    // Record digest in history
    await this.recordDigestHistory({
      userId,
      periodStart,
      periodEnd,
      frequency,
      totalNotifications: items.length,
      notificationGroups: this.summarizeGroups(digest.groups),
      channel: "email",
      batchId,
    });

    // Update config
    await this.updateNextSendTime(
      config.id,
      frequency,
      config.sendTime,
      config.sendDayOfWeek,
      config.timezone,
    );

    console.log(
      `✓ Sent ${frequency} digest to ${config.email} (${items.length} notifications)`,
    );
  }

  /**
   * Build digest content
   */
  private buildDigest(
    userId: string,
    periodStart: Date,
    periodEnd: Date,
    items: BatchItem[],
  ): DigestContent {
    // Group items by batch_group
    const groups: Record<string, BatchItem[]> = {};

    for (const item of items) {
      const group = item.batchGroup || "general";
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(item);
    }

    return {
      userId,
      periodStart,
      periodEnd,
      totalNotifications: items.length,
      groups,
    };
  }

  /**
   * Send digest email
   */
  private async sendDigestEmail(
    email: string,
    firstName: string,
    digest: DigestContent,
  ): Promise<void> {
    const subject = `Your dCMMS Notification Digest (${digest.totalNotifications} updates)`;

    // Build HTML email
    const html = this.buildDigestHTML(firstName, digest);
    const text = this.buildDigestText(firstName, digest);

    await this.emailService.sendEmail({
      to: email,
      subject,
      text,
      html,
    });
  }

  /**
   * Build digest HTML email
   */
  private buildDigestHTML(firstName: string, digest: DigestContent): string {
    const { periodStart, periodEnd, totalNotifications, groups } = digest;

    const periodStr = `${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`;

    let groupsHTML = "";
    const groupTitles: Record<string, string> = {
      alarms: "🔔 Alarms",
      work_orders: "🔧 Work Orders",
      inventory: "📦 Inventory",
      assets: "🏭 Assets",
      general: "📋 General",
    };

    for (const [groupName, items] of Object.entries(groups)) {
      const title = groupTitles[groupName] || groupName;

      groupsHTML += `
        <div style="margin-bottom: 30px;">
          <h2 style="color: #333; font-size: 18px; margin-bottom: 15px;">
            ${title} (${items.length})
          </h2>
          <table style="width: 100%; border-collapse: collapse;">
      `;

      for (const item of items) {
        const priorityColor = item.priority === "medium" ? "#FFA500" : "#999";
        const time = new Date(item.createdAt).toLocaleString();

        groupsHTML += `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px 0;">
              <div style="display: flex; align-items: center;">
                <span style="display: inline-block; width: 8px; height: 8px; background: ${priorityColor}; border-radius: 50%; margin-right: 10px;"></span>
                <div>
                  ${item.subject ? `<strong>${item.subject}</strong><br>` : ""}
                  <span style="color: #666;">${item.body.substring(0, 200)}${item.body.length > 200 ? "..." : ""}</span>
                  <br>
                  <small style="color: #999;">${time}</small>
                </div>
              </div>
            </td>
          </tr>
        `;
      }

      groupsHTML += `
          </table>
        </div>
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Notification Digest</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
          <h1 style="color: #0066cc; margin: 0 0 10px 0;">dCMMS Notification Digest</h1>
          <p style="color: #666; margin: 0;">
            ${periodStr} &bull; ${totalNotifications} updates
          </p>
        </div>

        <p>Hi ${firstName},</p>
        <p>Here's your summary of recent notifications:</p>

        ${groupsHTML}

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
          <p>You're receiving this digest because you've enabled notification batching in your dCMMS preferences.</p>
          <p><a href="${process.env.APP_URL || "http://localhost:3000"}/settings/notifications" style="color: #0066cc;">Manage notification preferences</a></p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Build digest plain text email
   */
  private buildDigestText(firstName: string, digest: DigestContent): string {
    const { periodStart, periodEnd, totalNotifications, groups } = digest;

    let text = `dCMMS Notification Digest\n`;
    text += `${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}\n`;
    text += `${totalNotifications} updates\n\n`;

    text += `Hi ${firstName},\n\n`;
    text += `Here's your summary of recent notifications:\n\n`;

    for (const [groupName, items] of Object.entries(groups)) {
      text += `\n${groupName.toUpperCase()} (${items.length})\n`;
      text += `${"=".repeat(50)}\n\n`;

      for (const item of items) {
        text += `- ${item.subject || item.body.substring(0, 100)}\n`;
        text += `  ${new Date(item.createdAt).toLocaleString()}\n\n`;
      }
    }

    text += `\nManage preferences: ${process.env.APP_URL || "http://localhost:3000"}/settings/notifications\n`;

    return text;
  }

  /**
   * Summarize groups for history
   */
  private summarizeGroups(
    groups: Record<string, BatchItem[]>,
  ): Record<string, number> {
    const summary: Record<string, number> = {};
    for (const [group, items] of Object.entries(groups)) {
      summary[group] = items.length;
    }
    return summary;
  }

  /**
   * Record digest in history
   */
  private async recordDigestHistory(params: {
    userId: string;
    periodStart: Date;
    periodEnd: Date;
    frequency: string;
    totalNotifications: number;
    notificationGroups: Record<string, number>;
    channel: string;
    batchId: string;
  }): Promise<void> {
    await this.db.query(
      `
      INSERT INTO notification_digest_history (
        user_id,
        period_start,
        period_end,
        frequency,
        total_notifications,
        notification_groups,
        channel
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
      [
        params.userId,
        params.periodStart,
        params.periodEnd,
        params.frequency,
        params.totalNotifications,
        JSON.stringify(params.notificationGroups),
        params.channel,
      ],
    );
  }

  /**
   * Update next send time
   */
  private async updateNextSendTime(
    configId: string,
    frequency: string,
    sendTime: string,
    sendDayOfWeek: number | null | undefined,
    timezone: string,
  ): Promise<void> {
    const result = await this.db.query(
      "SELECT calculate_next_send_time($1, $2, $3, $4) AS next_send",
      [frequency, sendTime, sendDayOfWeek, timezone],
    );

    const nextSend = result.rows[0].next_send;

    await this.db.query(
      `
      UPDATE notification_batch_config
      SET
        last_sent_at = NOW(),
        next_send_at = $1,
        updated_at = NOW()
      WHERE id = $2
    `,
      [nextSend, configId],
    );
  }

  /**
   * Get user's batch configuration
   */
  async getBatchConfig(userId: string): Promise<BatchConfig | null> {
    const result = await this.db.query(
      `
      SELECT
        id,
        user_id AS "userId",
        enabled,
        frequency,
        send_time AS "sendTime",
        send_day_of_week AS "sendDayOfWeek",
        timezone,
        batch_priorities AS "batchPriorities",
        channels,
        event_types AS "eventTypes",
        last_sent_at AS "lastSentAt",
        next_send_at AS "nextSendAt"
      FROM notification_batch_config
      WHERE user_id = $1
    `,
      [userId],
    );

    return result.rows[0] || null;
  }

  /**
   * Update user's batch configuration
   */
  async updateBatchConfig(
    userId: string,
    config: Partial<BatchConfig>,
  ): Promise<void> {
    const {
      enabled,
      frequency,
      sendTime,
      sendDayOfWeek,
      timezone,
      batchPriorities,
      channels,
      eventTypes,
    } = config;

    await this.db.query(
      `
      UPDATE notification_batch_config
      SET
        enabled = COALESCE($2, enabled),
        frequency = COALESCE($3, frequency),
        send_time = COALESCE($4, send_time),
        send_day_of_week = COALESCE($5, send_day_of_week),
        timezone = COALESCE($6, timezone),
        batch_priorities = COALESCE($7, batch_priorities),
        channels = COALESCE($8, channels),
        event_types = COALESCE($9, event_types),
        updated_at = NOW()
      WHERE user_id = $1
    `,
      [
        userId,
        enabled,
        frequency,
        sendTime,
        sendDayOfWeek,
        timezone,
        batchPriorities,
        channels,
        eventTypes,
      ],
    );

    // Recalculate next send time
    if (frequency || sendTime || sendDayOfWeek || timezone) {
      const configResult = await this.db.query(
        "SELECT id, frequency, send_time, send_day_of_week, timezone FROM notification_batch_config WHERE user_id = $1",
        [userId],
      );

      if (configResult.rows.length > 0) {
        const c = configResult.rows[0];
        await this.updateNextSendTime(
          c.id,
          c.frequency,
          c.send_time,
          c.send_day_of_week,
          c.timezone,
        );
      }
    }
  }
}

export default NotificationBatchService;
