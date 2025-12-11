import { FastifyInstance } from "fastify";

export interface SlackMessage {
  channel: string;
  text: string;
  blocks?: Record<string, unknown>[];
  attachments?: Record<string, unknown>[];
}

export interface SlackSendResult {
  status: "sent" | "failed";
  messageId?: string;
  timestamp?: string;
  error?: string;
}

export interface SlackInstallation {
  teamId: string;
  teamName: string;
  accessToken: string;
  botUserId: string;
  incomingWebhookUrl?: string;
  incomingWebhookChannel?: string;
  incomingWebhookChannelId?: string;
}

/**
 * Slack Provider Service
 * Handles Slack API integration and message sending
 */
export class SlackProviderService {
  private fastify: FastifyInstance;
  private readonly SLACK_API_BASE = "https://slack.com/api";

  // Store Slack installations (in production, this should be in database)
  private installations: Map<string, SlackInstallation> = new Map();

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

  /**
   * Send a Slack message
   */
  async send(params: {
    tenantId: string;
    channel: string;
    text: string;
    severity?: "critical" | "high" | "medium" | "low" | "info";
    title?: string;
    data?: Record<string, unknown>;
    actions?: Array<{
      type: string;
      text: string;
      value: string;
      url?: string;
    }>;
  }): Promise<SlackSendResult> {
    const { tenantId, channel, text, severity, title, data, actions } = params;

    try {
      // Get Slack installation for tenant
      const installation = this.installations.get(tenantId);

      if (!installation) {
        this.fastify.log.warn(
          { tenantId },
          "No Slack installation found for tenant",
        );
        return {
          status: "failed",
          error:
            "Slack not connected for this tenant. Please install the Slack app.",
        };
      }

      // Build Slack message with blocks
      const blocks = this.buildMessageBlocks({
        title: title || "Notification",
        text,
        severity,
        data,
        actions,
      });

      // Send message via Slack API
      const response = await fetch(`${this.SLACK_API_BASE}/chat.postMessage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Bearer ${installation.accessToken}`,
        },
        body: JSON.stringify({
          channel,
          text: title || text, // Fallback text for notifications
          blocks,
        }),
      });

      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error || "Failed to send Slack message");
      }

      this.fastify.log.info(
        { channel, timestamp: result.ts, messageId: result.message?.ts },
        "Slack message sent successfully",
      );

      return {
        status: "sent",
        messageId: result.message?.ts,
        timestamp: result.ts,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.fastify.log.error(
        { error, channel },
        "Failed to send Slack message",
      );
      return {
        status: "failed",
        error: errorMessage,
      };
    }
  }

  /**
   * Build Slack message blocks with rich formatting
   */
  private buildMessageBlocks(params: {
    title: string;
    text: string;
    severity?: "critical" | "high" | "medium" | "low" | "info";
    data?: Record<string, unknown>;
    actions?: Array<{
      type: string;
      text: string;
      value: string;
      url?: string;
    }>;
  }): Record<string, unknown>[] {
    const { title, text, severity, data, actions } = params;

    const blocks: Record<string, unknown>[] = [];

    // Determine color based on severity
    // const color = this.getSeverityColor(severity);
    const emoji = this.getSeverityEmoji(severity);

    // Header block with emoji
    blocks.push({
      type: "header",
      text: {
        type: "plain_text",
        text: `${emoji} ${title}`,
        emoji: true,
      },
    });

    // Divider
    blocks.push({
      type: "divider",
    });

    // Main message block
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text,
      },
    });

    // Add severity badge if provided
    if (severity) {
      blocks.push({
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `*Severity:* ${this.formatSeverity(severity)}`,
          },
        ],
      });
    }

    // Add additional data fields if provided
    if (data && Object.keys(data).length > 0) {
      const fields: Record<string, unknown>[] = [];

      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined && value !== null) {
          fields.push({
            type: "mrkdwn",
            text: `*${this.formatFieldName(key)}:*\n${value}`,
          });
        }
      }

      if (fields.length > 0) {
        blocks.push({
          type: "section",
          fields,
        });
      }
    }

    // Add action buttons if provided
    if (actions && actions.length > 0) {
      const elements: Record<string, unknown>[] = [];

      for (const action of actions) {
        if (action.url) {
          // Link button
          elements.push({
            type: "button",
            text: {
              type: "plain_text",
              text: action.text,
              emoji: true,
            },
            url: action.url,
            value: action.value,
          });
        } else {
          // Interactive button
          elements.push({
            type: "button",
            text: {
              type: "plain_text",
              text: action.text,
              emoji: true,
            },
            value: action.value,
            action_id: action.value,
          });
        }
      }

      if (elements.length > 0) {
        blocks.push({
          type: "actions",
          elements,
        });
      }
    }

    // Add color bar via attachment (deprecated but still works for color)
    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: ` `, // Empty context to add spacing
        },
      ],
    });

    return blocks;
  }

  /**
   * Get color for severity
   */
  private getSeverityColor(severity?: string): string {
    const colorMap: Record<string, string> = {
      critical: "#FF0000", // Red
      high: "#FF8C00", // Orange
      medium: "#FFD700", // Yellow
      low: "#00BFFF", // Light blue
      info: "#808080", // Gray
    };

    return severity ? colorMap[severity] || "#808080" : "#808080";
  }

  /**
   * Get emoji for severity
   */
  private getSeverityEmoji(severity?: string): string {
    const emojiMap: Record<string, string> = {
      critical: "🔴",
      high: "🟠",
      medium: "🟡",
      low: "🔵",
      info: "ℹ️",
    };

    return severity ? emojiMap[severity] || "ℹ️" : "ℹ️";
  }

  /**
   * Format severity for display
   */
  private formatSeverity(severity: string): string {
    const formatted = severity.toUpperCase();
    const emoji = this.getSeverityEmoji(severity);
    return `${emoji} ${formatted}`;
  }

  /**
   * Format field name for display
   */
  private formatFieldName(name: string): string {
    return name
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  /**
   * Store Slack installation (OAuth callback)
   */
  async storeInstallation(
    tenantId: string,
    installation: SlackInstallation,
  ): Promise<void> {
    this.installations.set(tenantId, installation);
    this.fastify.log.info(
      {
        tenantId,
        teamId: installation.teamId,
        teamName: installation.teamName,
      },
      "Slack installation stored",
    );
  }

  /**
   * Get Slack installation for tenant
   */
  getInstallation(tenantId: string): SlackInstallation | undefined {
    return this.installations.get(tenantId);
  }

  /**
   * Remove Slack installation
   */
  async removeInstallation(tenantId: string): Promise<void> {
    this.installations.delete(tenantId);
    this.fastify.log.info({ tenantId }, "Slack installation removed");
  }

  /**
   * Test Slack connection
   */
  async testConnection(
    tenantId: string,
    channel: string,
  ): Promise<SlackSendResult> {
    return this.send({
      tenantId,
      channel,
      text: "This is a test message from dCMMS. Your Slack integration is working! 🎉",
      severity: "info",
      title: "Connection Test",
    });
  }

  /**
   * Exchange OAuth code for access token
   */
  async exchangeOAuthCode(code: string): Promise<{
    accessToken: string;
    teamId: string;
    teamName: string;
    botUserId: string;
    incomingWebhook?: {
      url: string;
      channel: string;
      channelId: string;
    };
  }> {
    const clientId = process.env.SLACK_CLIENT_ID;
    const clientSecret = process.env.SLACK_CLIENT_SECRET;
    const redirectUri = process.env.SLACK_REDIRECT_URI;

    if (!clientId || !clientSecret) {
      throw new Error("Slack OAuth credentials not configured");
    }

    try {
      const response = await fetch(`${this.SLACK_API_BASE}/oauth.v2.access`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri || "",
        }).toString(),
      });

      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error || "Failed to exchange OAuth code");
      }

      this.fastify.log.info(
        { teamId: result.team.id, teamName: result.team.name },
        "Slack OAuth exchange successful",
      );

      return {
        accessToken: result.access_token,
        teamId: result.team.id,
        teamName: result.team.name,
        botUserId: result.bot_user_id,
        incomingWebhook: result.incoming_webhook
          ? {
              url: result.incoming_webhook.url,
              channel: result.incoming_webhook.channel,
              channelId: result.incoming_webhook.channel_id,
            }
          : undefined,
      };
    } catch (error: unknown) {
      this.fastify.log.error({ error }, "Failed to exchange Slack OAuth code");
      throw error;
    }
  }

  /**
   * Get Slack OAuth authorization URL
   */
  getAuthorizationUrl(state?: string): string {
    const clientId = process.env.SLACK_CLIENT_ID;
    const redirectUri = process.env.SLACK_REDIRECT_URI;

    if (!clientId) {
      throw new Error("Slack client ID not configured");
    }

    const scopes = [
      "chat:write",
      "chat:write.public",
      "channels:read",
      "groups:read",
      "im:read",
      "mpim:read",
      "incoming-webhook",
    ];

    const params = new URLSearchParams({
      client_id: clientId,
      scope: scopes.join(","),
      redirect_uri: redirectUri || "",
      ...(state && { state }),
    });

    return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
  }
}

export function createSlackProviderService(
  fastify: FastifyInstance,
): SlackProviderService {
  return new SlackProviderService(fastify);
}
