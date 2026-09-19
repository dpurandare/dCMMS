import crypto from "crypto";
import { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  validatorCompiler,
  serializerCompiler,
} from "fastify-type-provider-zod";
import { createSlackProviderService } from "../services/slack-provider.service";
import { authorize } from "../middleware/authorize";
import { getTenantId } from "../utils/tenant";

// Validation schemas
const slackTestSchema = z.object({
  tenantId: z.string().uuid(),
  channel: z.string(),
});

/**
 * Verifies a request actually came from Slack (REV-029 P0 fix).
 *
 * `/interactive` and `/events` are called by Slack's servers, not by a
 * logged-in dCMMS user — they can never carry a dCMMS bearer token, so they
 * must sit outside the `fastify.authenticate` hook. Without this signature
 * check, that made them fully open: anyone could POST a forged interactive
 * payload, including a `response_url` that `handleSlackAction` below then
 * `fetch()`s — a server-side request forgery primitive reachable by anyone
 * on the internet. See https://api.slack.com/authentication/verifying-requests-from-slack.
 */
function verifySlackSignature(request: FastifyRequest): boolean {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) {
    request.log.error(
      "SLACK_SIGNING_SECRET is not set — refusing all Slack webhook requests",
    );
    return false;
  }

  const timestamp = request.headers["x-slack-request-timestamp"];
  const signature = request.headers["x-slack-signature"];
  const rawBody = (request as { rawBody?: string }).rawBody;
  if (
    typeof timestamp !== "string" ||
    typeof signature !== "string" ||
    !rawBody
  ) {
    return false;
  }

  // Reject requests older than 5 minutes — replay protection.
  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > 60 * 5) {
    return false;
  }

  const expected =
    "v0=" +
    crypto
      .createHmac("sha256", signingSecret)
      .update(`v0:${timestamp}:${rawBody}`)
      .digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export default async function integrationRoutes(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  const slackService = createSlackProviderService(fastify);

  // ---------------------------------------------------------------------
  // Admin-facing routes: a logged-in dCMMS user managing their tenant's
  // Slack connection. Authenticated + authorized.
  // ---------------------------------------------------------------------
  await fastify.register(async (admin) => {
    admin.addHook("onRequest", admin.authenticate);
    admin.addHook(
      "onRequest",
      authorize({ permissions: ["manage:integrations"] }),
    );

    // Get Slack OAuth authorization URL
    admin.get<{
      Querystring: {
        tenantId: string;
      };
    }>("/integrations/slack/install", async (request, reply) => {
      try {
        const tenantId = getTenantId(request);

        // Generate state parameter to verify the callback
        const state = Buffer.from(
          JSON.stringify({ tenantId, timestamp: Date.now() }),
        ).toString("base64");

        const authUrl = slackService.getAuthorizationUrl(state);

        return reply.send({
          authUrl,
          message: "Redirect user to this URL to complete Slack installation",
        });
      } catch (error) {
        admin.log.error({ error }, "Failed to generate Slack auth URL");
        return reply.status(500).send({
          error: "Failed to generate Slack authorization URL",
        });
      }
    });

    // Test Slack connection
    admin.post<{
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
          const tenantId = getTenantId(request);
          const { channel } = request.body;

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
          admin.log.error({ error }, "Failed to test Slack connection");
          return reply.status(500).send({
            error: "Failed to test Slack connection",
          });
        }
      },
    );

    // Get Slack installation status
    admin.get<{
      Querystring: {
        tenantId: string;
      };
    }>("/integrations/slack/status", async (request, reply) => {
      try {
        const tenantId = getTenantId(request);
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
        admin.log.error({ error }, "Failed to get Slack status");
        return reply.status(500).send({
          error: "Failed to get Slack installation status",
        });
      }
    });

    // Uninstall Slack integration
    admin.delete<{
      Body: {
        tenantId: string;
      };
    }>("/integrations/slack/uninstall", async (request, reply) => {
      try {
        const tenantId = getTenantId(request);
        await slackService.removeInstallation(tenantId);

        admin.log.info({ tenantId }, "Slack integration uninstalled");

        return reply.send({
          success: true,
          message: "Slack integration uninstalled successfully",
        });
      } catch (error) {
        admin.log.error({ error }, "Failed to uninstall Slack integration");
        return reply.status(500).send({
          error: "Failed to uninstall Slack integration",
        });
      }
    });
  });

  // ---------------------------------------------------------------------
  // Slack-facing routes: called by Slack's own servers, never by a logged-in
  // dCMMS user, so none of these can sit behind `fastify.authenticate` — a
  // real browser OAuth redirect or a Slack webhook call carries no dCMMS
  // bearer token. `/callback` relies on its own state-parameter check
  // (already implemented, standard OAuth CSRF protection); `/interactive`
  // and `/events` require a valid Slack request signature instead.
  // ---------------------------------------------------------------------
  await fastify.register(async (slackPublic) => {
    // Capture the raw body for signature verification while still handing
    // handlers the parsed body they expect.
    slackPublic.addContentTypeParser(
      ["application/json", "application/x-www-form-urlencoded"],
      { parseAs: "string" },
      (request, body: string, done) => {
        (request as { rawBody?: string }).rawBody = body;
        try {
          const contentType = request.headers["content-type"] || "";
          if (contentType.includes("application/json")) {
            done(null, body.length ? JSON.parse(body) : {});
          } else {
            done(null, Object.fromEntries(new URLSearchParams(body)));
          }
        } catch (err) {
          done(err as Error, undefined);
        }
      },
    );

    // Slack OAuth callback handler
    slackPublic.get<{
      Querystring: {
        code?: string;
        state?: string;
        error?: string;
      };
    }>("/integrations/slack/callback", async (request, reply) => {
      try {
        const { code, state, error } = request.query;

        if (error) {
          slackPublic.log.warn({ error }, "Slack OAuth error");
          return reply.status(400).send({
            error: `Slack OAuth error: ${error}`,
          });
        }

        if (!code) {
          return reply.status(400).send({
            error: "Missing authorization code",
          });
        }

        // Verify state parameter — this is the callback's real security
        // boundary, not a bearer token (see comment above).
        let tenantId: string;
        try {
          const stateData = JSON.parse(
            Buffer.from(state || "", "base64").toString(),
          );
          tenantId = stateData.tenantId;

          const stateAge = Date.now() - stateData.timestamp;
          if (stateAge > 15 * 60 * 1000) {
            throw new Error("State parameter expired");
          }
        } catch (error) {
          slackPublic.log.error({ error }, "Invalid state parameter");
          return reply.status(400).send({
            error: "Invalid or expired state parameter",
          });
        }

        const oauthResult = await slackService.exchangeOAuthCode(code);

        await slackService.storeInstallation(tenantId, {
          teamId: oauthResult.teamId,
          teamName: oauthResult.teamName,
          accessToken: oauthResult.accessToken,
          botUserId: oauthResult.botUserId,
          incomingWebhookUrl: oauthResult.incomingWebhook?.url,
          incomingWebhookChannel: oauthResult.incomingWebhook?.channel,
          incomingWebhookChannelId: oauthResult.incomingWebhook?.channelId,
        });

        slackPublic.log.info(
          {
            tenantId,
            teamId: oauthResult.teamId,
            teamName: oauthResult.teamName,
          },
          "Slack installation completed",
        );

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
        slackPublic.log.error({ error }, "Failed to complete Slack OAuth");
        return reply.status(500).send({
          error: "Failed to complete Slack installation",
        });
      }
    });

    // Slack interactive endpoint (for button clicks)
    slackPublic.post(
      "/integrations/slack/interactive",
      async (request, reply) => {
        if (!verifySlackSignature(request)) {
          return reply.status(401).send({ error: "Invalid Slack signature" });
        }

        try {
          // Slack sends the payload as URL-encoded form data
          const payload = JSON.parse((request.body as any).payload || "{}");
          const {
            type,
            user,
            actions,
            response_url,
            trigger_id: _trigger_id,
          } = payload;

          slackPublic.log.info(
            { type, userId: user?.id, actions },
            "Slack interactive event received",
          );

          switch (type) {
            case "block_actions":
              if (actions && actions.length > 0) {
                for (const action of actions) {
                  await handleSlackAction(action, user, response_url);
                }
              }
              break;

            case "view_submission":
              slackPublic.log.info("View submission received");
              break;

            case "shortcut":
              slackPublic.log.info("Shortcut received");
              break;

            default:
              slackPublic.log.warn({ type }, "Unknown interaction type");
          }

          return reply.send({
            ok: true,
          });
        } catch (error) {
          slackPublic.log.error(
            { error },
            "Failed to handle Slack interactive event",
          );
          return reply.status(500).send({
            error: "Failed to handle interactive event",
          });
        }
      },
    );

    /**
     * Handle Slack button action
     */
    async function handleSlackAction(
      action: any,
      user: any,
      responseUrl: string,
    ): Promise<void> {
      const { action_id, value } = action;

      slackPublic.log.info(
        { action_id, value, userId: user?.id },
        "Handling Slack action",
      );

      // Defense in depth on top of the signature check above: Slack always
      // issues response_url on its own domain, so refuse anything else
      // rather than letting this become an SSRF primitive even in the
      // unlikely event the signature check is ever weakened or bypassed.
      if (responseUrl && !/^https:\/\/hooks\.slack\.com\//.test(responseUrl)) {
        slackPublic.log.error(
          { responseUrl },
          "Refusing to call a response_url outside hooks.slack.com",
        );
        return;
      }

      try {
        const [actionType, entityType, entityId] = value.split("_");

        if (actionType === "acknowledge" && entityType === "alert") {
          slackPublic.log.info(
            { alertId: entityId, userId: user?.id },
            "Acknowledging alert from Slack",
          );

          // TODO: Call alert acknowledgment API
          if (responseUrl) {
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
          }
        } else if (actionType === "view" && entityType === "wo") {
          slackPublic.log.info(
            { woId: entityId },
            "Viewing work order from Slack",
          );
        } else {
          slackPublic.log.warn(
            { actionType, entityType },
            "Unknown action type",
          );
        }
      } catch (error) {
        slackPublic.log.error(
          { error, action },
          "Failed to handle Slack action",
        );
      }
    }

    // Slack events endpoint (for mentions, messages, etc.)
    slackPublic.post("/integrations/slack/events", async (request, reply) => {
      const body = request.body as any;

      // The URL-verification handshake happens before an app has a signing
      // secret configured in some setups, but dCMMS requires one to accept
      // any Slack traffic at all — Slack re-sends the challenge until it
      // succeeds, so this fails closed rather than skipping verification.
      if (!verifySlackSignature(request)) {
        return reply.status(401).send({ error: "Invalid Slack signature" });
      }

      try {
        if (body.type === "url_verification") {
          return reply.send({
            challenge: body.challenge,
          });
        }

        if (body.type === "event_callback") {
          const { event } = body;
          slackPublic.log.info(
            { eventType: event.type },
            "Slack event received",
          );

          switch (event.type) {
            case "app_mention":
              slackPublic.log.info(
                { user: event.user, text: event.text },
                "App mentioned",
              );
              break;

            case "message":
              slackPublic.log.info(
                { user: event.user, channel: event.channel },
                "Message received",
              );
              break;

            default:
              slackPublic.log.info(
                { eventType: event.type },
                "Unhandled event type",
              );
          }
        }

        return reply.send({
          ok: true,
        });
      } catch (error) {
        slackPublic.log.error({ error }, "Failed to handle Slack event");
        return reply.status(500).send({
          error: "Failed to handle Slack event",
        });
      }
    });
  });
}
