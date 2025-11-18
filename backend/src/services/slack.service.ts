/**
 * Slack Integration Service (DCMMS-072)
 *
 * Features:
 * - Slack App OAuth (workspace installation)
 * - Rich message formatting with Block Kit
 * - Interactive buttons and actions
 * - Channel and DM support
 * - Thread support for context
 *
 * Setup:
 * 1. Create Slack App at https://api.slack.com/apps
 * 2. Add Bot Token Scopes: chat:write, users:read, channels:read
 * 3. Install app to workspace
 * 4. Save tokens to environment variables
 *
 * Configuration:
 *   SLACK_BOT_TOKEN=xoxb-...
 *   SLACK_CLIENT_ID=...
 *   SLACK_CLIENT_SECRET=...
 *   SLACK_SIGNING_SECRET=...
 */

import { WebClient } from '@slack/web-api';
import crypto from 'crypto';

// ==========================================
// Types
// ==========================================

export interface SlackMessageOptions {
  channel: string; // Channel ID or user ID (for DM)
  text: string; // Fallback text
  blocks?: any[]; // Block Kit blocks
  threadTs?: string; // Thread timestamp (for replies)
  attachments?: any[]; // Legacy attachments
}

export interface SlackAlarmMessage {
  alarmId: string;
  severity: 'critical' | 'warning' | 'info';
  assetName: string;
  siteName: string;
  sensorType: string;
  value: number;
  unit: string;
  threshold: number;
  timestamp: string;
  appUrl: string;
}

export interface SlackWorkOrderMessage {
  workOrderId: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  assignedTo: string;
  dueDate: string;
  assetName: string;
  appUrl: string;
}

export interface SlackResult {
  success: boolean;
  messageTs?: string; // Timestamp of sent message
  channel?: string;
  error?: string;
}

// ==========================================
// Slack Service
// ==========================================

export class SlackService {
  private client: WebClient;
  private signingSecret: string;

  constructor() {
    const botToken = process.env.SLACK_BOT_TOKEN;
    this.signingSecret = process.env.SLACK_SIGNING_SECRET || '';

    if (!botToken) {
      console.warn('Slack bot token not configured, Slack notifications disabled');
    }

    this.client = new WebClient(botToken);
  }

  /**
   * Send plain text message to channel
   */
  async sendMessage(channel: string, text: string): Promise<SlackResult> {
    try {
      const result = await this.client.chat.postMessage({
        channel,
        text,
      });

      return {
        success: true,
        messageTs: result.ts as string,
        channel: result.channel as string,
      };
    } catch (error: any) {
      console.error('Slack sendMessage error:', error);
      return {
        success: false,
        error: error.message || 'Unknown Slack error',
      };
    }
  }

  /**
   * Send rich Block Kit message
   */
  async sendBlockMessage(options: SlackMessageOptions): Promise<SlackResult> {
    try {
      const result = await this.client.chat.postMessage({
        channel: options.channel,
        text: options.text,
        blocks: options.blocks,
        attachments: options.attachments,
        thread_ts: options.threadTs,
      });

      return {
        success: true,
        messageTs: result.ts as string,
        channel: result.channel as string,
      };
    } catch (error: any) {
      console.error('Slack sendBlockMessage error:', error);
      return {
        success: false,
        error: error.message || 'Unknown Slack error',
      };
    }
  }

  /**
   * Send critical alarm notification with interactive buttons
   */
  async sendAlarmNotification(channel: string, alarm: SlackAlarmMessage): Promise<SlackResult> {
    const severityEmoji = {
      critical: '🔴',
      warning: '⚠️',
      info: 'ℹ️',
    };

    const severityColor = {
      critical: '#FF0000',
      warning: '#FFA500',
      info: '#0099FF',
    };

    const blocks = [
      // Header
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${severityEmoji[alarm.severity]} ${alarm.severity.toUpperCase()} Alarm`,
          emoji: true,
        },
      },
      // Alarm details
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Asset:*\n${alarm.assetName}`,
          },
          {
            type: 'mrkdwn',
            text: `*Site:*\n${alarm.siteName}`,
          },
          {
            type: 'mrkdwn',
            text: `*Sensor:*\n${alarm.sensorType}`,
          },
          {
            type: 'mrkdwn',
            text: `*Value:*\n${alarm.value} ${alarm.unit}`,
          },
          {
            type: 'mrkdwn',
            text: `*Threshold:*\n${alarm.threshold} ${alarm.unit}`,
          },
          {
            type: 'mrkdwn',
            text: `*Time:*\n${new Date(alarm.timestamp).toLocaleString()}`,
          },
        ],
      },
      // Divider
      {
        type: 'divider',
      },
      // Actions
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '✓ Acknowledge',
              emoji: true,
            },
            style: 'primary',
            value: alarm.alarmId,
            action_id: 'acknowledge_alarm',
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '📋 View Details',
              emoji: true,
            },
            url: `${alarm.appUrl}/alarms/${alarm.alarmId}`,
            action_id: 'view_alarm',
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '🔧 Create Work Order',
              emoji: true,
            },
            value: alarm.alarmId,
            action_id: 'create_work_order',
          },
        ],
      },
    ];

    return this.sendBlockMessage({
      channel,
      text: `${alarm.severity.toUpperCase()} Alarm: ${alarm.assetName} - ${alarm.sensorType} at ${alarm.value}${alarm.unit}`,
      blocks,
    });
  }

  /**
   * Send work order assignment notification
   */
  async sendWorkOrderNotification(channel: string, workOrder: SlackWorkOrderMessage): Promise<SlackResult> {
    const priorityEmoji = {
      high: '🔴',
      medium: '🟡',
      low: '🟢',
    };

    const blocks = [
      // Header
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${priorityEmoji[workOrder.priority]} New Work Order Assigned`,
          emoji: true,
        },
      },
      // Work order details
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${workOrder.title}*`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Priority:*\n${workOrder.priority.toUpperCase()}`,
          },
          {
            type: 'mrkdwn',
            text: `*Due Date:*\n${new Date(workOrder.dueDate).toLocaleDateString()}`,
          },
          {
            type: 'mrkdwn',
            text: `*Asset:*\n${workOrder.assetName}`,
          },
          {
            type: 'mrkdwn',
            text: `*Assigned To:*\n${workOrder.assignedTo}`,
          },
        ],
      },
      // Divider
      {
        type: 'divider',
      },
      // Actions
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '✓ Accept',
              emoji: true,
            },
            style: 'primary',
            value: workOrder.workOrderId,
            action_id: 'accept_work_order',
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '📋 View Details',
              emoji: true,
            },
            url: `${workOrder.appUrl}/work-orders/${workOrder.workOrderId}`,
            action_id: 'view_work_order',
          },
        ],
      },
    ];

    return this.sendBlockMessage({
      channel,
      text: `New Work Order: ${workOrder.title} - ${workOrder.priority} priority`,
      blocks,
    });
  }

  /**
   * Update existing message (e.g., after button click)
   */
  async updateMessage(
    channel: string,
    messageTs: string,
    text: string,
    blocks?: any[]
  ): Promise<SlackResult> {
    try {
      const result = await this.client.chat.update({
        channel,
        ts: messageTs,
        text,
        blocks,
      });

      return {
        success: true,
        messageTs: result.ts as string,
        channel: result.channel as string,
      };
    } catch (error: any) {
      console.error('Slack updateMessage error:', error);
      return {
        success: false,
        error: error.message || 'Unknown Slack error',
      };
    }
  }

  /**
   * Get user info by email
   */
  async getUserByEmail(email: string): Promise<{ id: string; name: string } | null> {
    try {
      const result = await this.client.users.lookupByEmail({ email });
      if (result.ok && result.user) {
        return {
          id: result.user.id as string,
          name: result.user.real_name as string,
        };
      }
      return null;
    } catch (error: any) {
      console.error('Slack getUserByEmail error:', error);
      return null;
    }
  }

  /**
   * Get channel ID by name
   */
  async getChannelByName(name: string): Promise<string | null> {
    try {
      // Remove # prefix if present
      const channelName = name.replace(/^#/, '');

      const result = await this.client.conversations.list({
        types: 'public_channel,private_channel',
      });

      if (result.ok && result.channels) {
        const channel = result.channels.find((c: any) => c.name === channelName);
        return channel ? (channel.id as string) : null;
      }

      return null;
    } catch (error: any) {
      console.error('Slack getChannelByName error:', error);
      return null;
    }
  }

  /**
   * Verify Slack request signature
   * (For webhook endpoints receiving Slack events)
   */
  verifySlackRequest(
    requestBody: string,
    timestamp: string,
    signature: string
  ): boolean {
    try {
      // Check timestamp is within 5 minutes
      const currentTime = Math.floor(Date.now() / 1000);
      const requestTime = parseInt(timestamp);

      if (Math.abs(currentTime - requestTime) > 300) {
        console.warn('Slack request timestamp too old');
        return false;
      }

      // Compute expected signature
      const sigBasestring = `v0:${timestamp}:${requestBody}`;
      const expectedSignature = `v0=${crypto
        .createHmac('sha256', this.signingSecret)
        .update(sigBasestring)
        .digest('hex')}`;

      // Compare signatures
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error('Slack signature verification error:', error);
      return false;
    }
  }

  /**
   * Handle interactive button action
   * (Called from webhook endpoint)
   */
  async handleInteractiveAction(payload: any): Promise<void> {
    const { type, user, actions, channel, message } = payload;

    if (type !== 'block_actions' || !actions || actions.length === 0) {
      return;
    }

    const action = actions[0];
    const actionId = action.action_id;
    const value = action.value;

    console.log(`Slack action: ${actionId} by user ${user.id} with value ${value}`);

    // Handle different actions
    switch (actionId) {
      case 'acknowledge_alarm':
        await this.handleAcknowledgeAlarm(value, user.id, channel.id, message.ts);
        break;

      case 'create_work_order':
        await this.handleCreateWorkOrder(value, user.id, channel.id, message.ts);
        break;

      case 'accept_work_order':
        await this.handleAcceptWorkOrder(value, user.id, channel.id, message.ts);
        break;

      default:
        console.warn(`Unknown action: ${actionId}`);
    }
  }

  /**
   * Handle alarm acknowledgment button
   */
  private async handleAcknowledgeAlarm(
    alarmId: string,
    userId: string,
    channelId: string,
    messageTs: string
  ): Promise<void> {
    try {
      // TODO: Call alarm acknowledgment API
      // await acknowledgeAlarm(alarmId, userId);

      // Update message to show acknowledged
      await this.updateMessage(
        channelId,
        messageTs,
        'Alarm acknowledged',
        [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `✅ *Alarm acknowledged* by <@${userId}>`,
            },
          },
        ]
      );

      console.log(`Alarm ${alarmId} acknowledged by user ${userId}`);
    } catch (error) {
      console.error('Error acknowledging alarm:', error);
    }
  }

  /**
   * Handle create work order button
   */
  private async handleCreateWorkOrder(
    alarmId: string,
    userId: string,
    channelId: string,
    messageTs: string
  ): Promise<void> {
    try {
      // TODO: Call work order creation API
      // const workOrder = await createWorkOrderFromAlarm(alarmId, userId);

      // Reply in thread
      await this.sendMessage(
        channelId,
        `Work order creation initiated for alarm ${alarmId}. <@${userId}> will be notified when complete.`
      );

      console.log(`Work order creation initiated for alarm ${alarmId} by user ${userId}`);
    } catch (error) {
      console.error('Error creating work order:', error);
    }
  }

  /**
   * Handle accept work order button
   */
  private async handleAcceptWorkOrder(
    workOrderId: string,
    userId: string,
    channelId: string,
    messageTs: string
  ): Promise<void> {
    try {
      // TODO: Call work order acceptance API
      // await acceptWorkOrder(workOrderId, userId);

      // Update message
      await this.updateMessage(
        channelId,
        messageTs,
        'Work order accepted',
        [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `✅ *Work order accepted* by <@${userId}>`,
            },
          },
        ]
      );

      console.log(`Work order ${workOrderId} accepted by user ${userId}`);
    } catch (error) {
      console.error('Error accepting work order:', error);
    }
  }

  /**
   * Test Slack connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.client.auth.test();
      console.log('Slack connection successful:', result);
      return result.ok || false;
    } catch (error) {
      console.error('Slack connection test failed:', error);
      return false;
    }
  }
}

export default SlackService;
