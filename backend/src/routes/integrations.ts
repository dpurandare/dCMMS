import { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  validatorCompiler,
  serializerCompiler,
} from "fastify-type-provider-zod";
import { createSlackProviderService } from "../services/slack-provider.service";

// Validation schemas
const slackOAuthCallbackSchema = z.object({
  code: z.string(),
  state: z.string().optional(),
});

const slackTestSchema = z.object({
  tenantId: z.string().uuid(),
  channel: z.string(),
});

const slackInteractionSchema = z.object({
  type: z.string(),
  user: z.object({
    id: z.string(),
    username: z.string(),
    name: z.string().optional(),
  }),
  actions: z.array(z.any()).optional(),
  response_url: z.string().optional(),
  trigger_id: z.string().optional(),
});

export default async function integrationRoutes(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  const slackService = createSlackProviderService(fastify);

  // Get Slack OAuth authorization URL
  fastify.get<{
    Querystring: {
      tenantId: string;
    };
  }>("/integrations/slack/install", async (request, reply) => {
    try {
      const { tenantId } = request.query;

      // Generate state parameter to verify the callback
      const state = Buffer.from(
        JSON.stringify({ tenantId, timestamp: Date.now() }),
      ).toString("base64");

      // Get authorization URL
      const authUrl = slackService.getAuthorizationUrl(state);

      return reply.send({
        authUrl,
        message: "Redirect user to this URL to complete Slack installation",
      });
    } catch (error) {
      fastify.log.error({ error }, "Failed to generate Slack auth URL");
      return reply.status(500).send({
        error: "Failed to generate Slack authorization URL",
      });
    }
  });

  // Slack OAuth callback handler
  fastify.get<{
    Querystring: {
      code?: string;
      state?: string;
      error?: string;
    };
  }>("/integrations/slack/callback", async (request, reply) => {
    try {
      const { code, state, error } = request.query;

      // Check for OAuth errors
      if (error) {
        fastify.log.warn({ error }, "Slack OAuth error");
        return reply.status(400).send({
          error: `Slack OAuth error: ${error}`,
        });
      }

      if (!code) {
        return reply.status(400).send({
          error: "Missing authorization code",
        });
      }

      // Verify state parameter
      let tenantId: string;
      try {
        const stateData = JSON.parse(
          Buffer.from(state || "", "base64").toString(),
        );
        tenantId = stateData.tenantId;

        // Check if state is not too old (15 minutes)
        const stateAge = Date.now() - stateData.timestamp;
        if (stateAge > 15 * 60 * 1000) {
          throw new Error("State parameter expired");
        }
      } catch (error) {
        fastify.log.error({ error }, "Invalid state parameter");
        return reply.status(400).send({
          error: "Invalid or expired state parameter",
        });
      }

      // Exchange code for access token
      const oauthResult = await slackService.exchangeOAuthCode(code);

      // Store installation
      await slackService.storeInstallation(tenantId, {
        teamId: oauthResult.teamId,
        teamName: oauthResult.teamName,
        accessToken: oauthResult.accessToken,
        botUserId: oauthResult.botUserId,
        incomingWebhookUrl: oauthResult.incomingWebhook?.url,
        incomingWebhookChannel: oauthResult.incomingWebhook?.channel,
        incomingWebhookChannelId: oauthResult.incomingWebhook?.channelId,
      });

      fastify.log.info(
        {
          tenantId,
          teamId: oauthResult.teamId,
          teamName: oauthResult.teamName,
        },
        "Slack installation completed",
      );

      // Redirect to success page or return success response
      return reply.send({
        success: true,
        message: "Slack integration installed successfully",
        team: {
          id: oauthResult.teamId,
          name: oauthResult.teamName,
        },
        webhook: oauthResult.incomingWebhook
          ? {
              channel: oauthResult.incomingWebhook.channel,
            }
          : null,
      });
    } catch (error) {
      fastify.log.error({ error }, "Failed to complete Slack OAuth");
      return reply.status(500).send({
        error: "Failed to complete Slack installation",
      });
    }
  });

  // Test Slack connection
  fastify.post<{
    Body: z.infer<typeof slackTestSchema>;
  }>(
    "/integrations/slack/test",
    {
      schema: {
        body: slackTestSchema,
      },
    },
    async (request, reply) => {
      try {
        const { tenantId, channel } = request.body;

        // Test connection
        const result = await slackService.testConnection(tenantId, channel);

        if (result.status === "sent") {
          return reply.send({
            success: true,
            message: "Test message sent successfully",
            messageId: result.messageId,
          });
        } else {
          return reply.status(400).send({
            success: false,
            error: result.error || "Failed to send test message",
          });
        }
      } catch (error) {
        fastify.log.error({ error }, "Failed to test Slack connection");
        return reply.status(500).send({
          error: "Failed to test Slack connection",
        });
      }
    },
  );

  // Get Slack installation status
  fastify.get<{
    Querystring: {
      tenantId: string;
    };
  }>("/integrations/slack/status", async (request, reply) => {
    try {
      const { tenantId } = request.query;

      const installation = slackService.getInstallation(tenantId);

      if (!installation) {
        return reply.send({
          installed: false,
          message: "Slack is not installed for this tenant",
        });
      }

      return reply.send({
        installed: true,
        team: {
          id: installation.teamId,
          name: installation.teamName,
        },
        webhook: installation.incomingWebhookUrl
          ? {
              channel: installation.incomingWebhookChannel,
            }
          : null,
      });
    } catch (error) {
      fastify.log.error({ error }, "Failed to get Slack status");
      return reply.status(500).send({
        error: "Failed to get Slack installation status",
      });
    }
  });

  // Uninstall Slack integration
  fastify.delete<{
    Body: {
      tenantId: string;
    };
  }>("/integrations/slack/uninstall", async (request, reply) => {
    try {
      const { tenantId } = request.body;

      await slackService.removeInstallation(tenantId);

      fastify.log.info({ tenantId }, "Slack integration uninstalled");

      return reply.send({
        success: true,
        message: "Slack integration uninstalled successfully",
      });
    } catch (error) {
      fastify.log.error({ error }, "Failed to uninstall Slack integration");
      return reply.status(500).send({
        error: "Failed to uninstall Slack integration",
      });
    }
  });

  // Slack interactive endpoint (for button clicks)
  fastify.post("/integrations/slack/interactive", async (request, reply) => {
    try {
      // Slack sends the payload as URL-encoded form data
      const payload = JSON.parse((request.body as any).payload || "{}");

      const { type, user, actions, response_url, trigger_id } = payload;

      fastify.log.info(
        { type, userId: user?.id, actions },
        "Slack interactive event received",
      );

      // Handle different interaction types
      switch (type) {
        case "block_actions":
          // Handle button clicks
          if (actions && actions.length > 0) {
            for (const action of actions) {
              await handleSlackAction(action, user, response_url);
            }
          }
          break;

        case "view_submission":
          // Handle modal submissions
          fastify.log.info("View submission received");
          break;

        case "shortcut":
          // Handle shortcuts
          fastify.log.info("Shortcut received");
          break;

        default:
          fastify.log.warn({ type }, "Unknown interaction type");
      }

      // Acknowledge the interaction
      return reply.send({
        ok: true,
      });
    } catch (error) {
      fastify.log.error({ error }, "Failed to handle Slack interactive event");
      return reply.status(500).send({
        error: "Failed to handle interactive event",
      });
    }
  });

  /**
   * Handle Slack button action
   */
  async function handleSlackAction(
    action: any,
    user: any,
    responseUrl: string,
  ): Promise<void> {
    const { action_id, value } = action;

    fastify.log.info(
      { action_id, value, userId: user?.id },
      "Handling Slack action",
    );

    try {
      // Parse action value (format: "acknowledge_alert_<alertId>" or "view_wo_<woId>")
      const [actionType, entityType, entityId] = value.split("_");

      if (actionType === "acknowledge" && entityType === "alert") {
        // Handle alert acknowledgment
        fastify.log.info(
          { alertId: entityId, userId: user?.id },
          "Acknowledging alert from Slack",
        );

        // TODO: Call alert acknowledgment API
        // For now, send a response message
        await fetch(responseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: `Alert ${entityId} has been acknowledged by ${user?.name || user?.username}`,
            replace_original: false,
          }),
        });
      } else if (actionType === "view" && entityType === "wo") {
        // Handle work order view
        fastify.log.info({ woId: entityId }, "Viewing work order from Slack");

        // The button should have a URL, so this is just logging
      } else {
        fastify.log.warn({ actionType, entityType }, "Unknown action type");
      }
    } catch (error) {
      fastify.log.error({ error, action }, "Failed to handle Slack action");
    }
  }

  // Slack events endpoint (for mentions, messages, etc.)
  fastify.post("/integrations/slack/events", async (request, reply) => {
    try {
      const body = request.body as any;

      // Handle URL verification challenge
      if (body.type === "url_verification") {
        return reply.send({
          challenge: body.challenge,
        });
      }

      // Handle events
      if (body.type === "event_callback") {
        const { event } = body;
        fastify.log.info({ eventType: event.type }, "Slack event received");

        // Handle different event types
        switch (event.type) {
          case "app_mention":
            fastify.log.info(
              { user: event.user, text: event.text },
              "App mentioned",
            );
            break;

          case "message":
            fastify.log.info(
              { user: event.user, channel: event.channel },
              "Message received",
            );
            break;

          default:
            fastify.log.info({ eventType: event.type }, "Unhandled event type");
        }
      }

      // Acknowledge the event
      return reply.send({
        ok: true,
      });
    } catch (error) {
      fastify.log.error({ error }, "Failed to handle Slack event");
      return reply.status(500).send({
        error: "Failed to handle Slack event",
      });
    }
  });
}
