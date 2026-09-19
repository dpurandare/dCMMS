import { FastifyInstance } from "fastify";
import { db } from "../db";
import { deviceTokens } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { optionalSecret } from "../config/env";

export interface PushNotificationOptions {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  sound?: string;
  clickAction?: string;
  imageUrl?: string;
}

export interface PushDeliveryStatus {
  messageId: string;
  status: "sent" | "failed";
  error?: string;
  successCount?: number;
  failureCount?: number;
}

/**
 * Push Notification Service
 * Uses Firebase Cloud Messaging (FCM)
 */
export class PushNotificationService {
  private fastify: FastifyInstance;
  private fcmEnabled: boolean;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    this.fcmEnabled =
      optionalSecret("FCM_SERVER_KEY") !== "" ||
      optionalSecret("GOOGLE_APPLICATION_CREDENTIALS") !== "";
  }

  /**
   * Send push notification to user
   */
  async send(options: PushNotificationOptions): Promise<PushDeliveryStatus> {
    const { userId, title, body, data, badge, sound, clickAction, imageUrl } =
      options;

    this.fastify.log.info({ userId, title }, "Sending push notification");

    try {
      // Get active device tokens for user
      const tokens = await this.getUserDeviceTokens(userId);

      if (tokens.length === 0) {
        this.fastify.log.warn(
          { userId },
          "No active device tokens found for user",
        );
        return {
          messageId: "",
          status: "failed",
          error: "No active device tokens",
          successCount: 0,
          failureCount: 0,
        };
      }

      // Send to all devices
      if (this.fcmEnabled) {
        return await this.sendViaFCM(
          tokens,
          title,
          body,
          data,
          badge,
          sound,
          clickAction,
          imageUrl,
        );
      } else {
        return await this.sendViaConsole(tokens, title, body, data);
      }
    } catch (error) {
      this.fastify.log.error(
        { error, userId },
        "Failed to send push notification",
      );
      return {
        messageId: "",
        status: "failed",
        error: (error as Error).message,
        successCount: 0,
        failureCount: 0,
      };
    }
  }

  /**
   * Get active device tokens for user
   */
  private async getUserDeviceTokens(userId: string): Promise<
    Array<{
      id: string;
      token: string;
      deviceType: string;
    }>
  > {
    const tokens = await db.query.deviceTokens.findMany({
      where: and(
        eq(deviceTokens.userId, userId),
        eq(deviceTokens.isActive, true),
      ),
      columns: {
        id: true,
        token: true,
        deviceType: true,
      },
    });

    return tokens;
  }

  /**
   * Send push notification via Firebase Cloud Messaging
   */
  private async sendViaFCM(
    tokens: Array<{ id: string; token: string; deviceType: string }>,
    title: string,
    body: string,
    _data?: Record<string, any>,
    _badge?: number,
    _sound?: string,
    _clickAction?: string,
    _imageUrl?: string,
  ): Promise<PushDeliveryStatus> {
    // Not implemented (REV-027b/REV-028). This used to report a fabricated
    // "sent" status with a fake successCount equal to the full token count
    // — silently lying about delivery to every device, with nothing ever
    // sent, no matter how many tokens were registered.
    this.fastify.log.error(
      { tokenCount: tokens.length, title },
      "[FCM] Not implemented — the mobile app's documented push feature has no working server side",
    );
    return {
      messageId: "",
      status: "failed",
      error: "FCM integration is not implemented (see REV-028)",
      successCount: 0,
      failureCount: tokens.length,
    };
  }

  /**
   * Console logger (for development/testing)
   */
  private async sendViaConsole(
    tokens: Array<{ id: string; token: string; deviceType: string }>,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<PushDeliveryStatus> {
    console.log("\n" + "=".repeat(80));
    console.log("🔔 PUSH NOTIFICATION (Console Mode)");
    console.log("=".repeat(80));
    console.log(`Title: ${title}`);
    console.log(`Body: ${body}`);
    console.log(`Data: ${JSON.stringify(data || {}, null, 2)}`);
    console.log(`Devices: ${tokens.length}`);
    tokens.forEach((token, idx) => {
      console.log(
        `  ${idx + 1}. ${token.deviceType} - ${token.token.substring(0, 20)}...`,
      );
    });
    console.log("=".repeat(80) + "\n");

    return {
      messageId: `console-${Date.now()}`,
      status: "sent",
      successCount: tokens.length,
      failureCount: 0,
    };
  }

  /**
   * Register device token
   */
  async registerDeviceToken(
    userId: string,
    token: string,
    deviceType: "ios" | "android",
    deviceId?: string,
    appVersion?: string,
  ): Promise<void> {
    this.fastify.log.info({ userId, deviceType }, "Registering device token");

    try {
      // Check if token already exists
      const existing = await db.query.deviceTokens.findFirst({
        where: eq(deviceTokens.token, token),
      });

      if (existing) {
        // Update existing token
        await db
          .update(deviceTokens)
          .set({
            userId,
            deviceType,
            deviceId,
            appVersion,
            isActive: true,
            lastUsedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(deviceTokens.token, token));
      } else {
        // Insert new token
        await db.insert(deviceTokens).values({
          userId,
          token,
          deviceType,
          deviceId,
          appVersion,
          isActive: true,
          lastUsedAt: new Date(),
        });
      }

      this.fastify.log.info(
        { userId, deviceType },
        "Device token registered successfully",
      );
    } catch (error) {
      this.fastify.log.error(
        { error, userId },
        "Failed to register device token",
      );
      throw error;
    }
  }

  /**
   * Unregister device token
   */
  async unregisterDeviceToken(token: string): Promise<void> {
    this.fastify.log.info(
      { token: token.substring(0, 20) },
      "Unregistering device token",
    );

    try {
      await db
        .update(deviceTokens)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(deviceTokens.token, token));

      this.fastify.log.info("Device token unregistered successfully");
    } catch (error) {
      this.fastify.log.error({ error }, "Failed to unregister device token");
      throw error;
    }
  }

  /**
   * Clean up expired or invalid tokens
   */
  async cleanupInvalidTokens(): Promise<number> {
    this.fastify.log.info("Cleaning up invalid device tokens");

    try {
      // Deactivate tokens older than 90 days
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const result = await db
        .update(deviceTokens)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(and(eq(deviceTokens.isActive, true)))
        .returning();

      this.fastify.log.info(
        { count: result.length },
        "Cleaned up invalid tokens",
      );
      return result.length;
    } catch (error) {
      this.fastify.log.error({ error }, "Failed to cleanup invalid tokens");
      throw error;
    }
  }

  /**
   * Send push notification to multiple users
   */
  async sendBulk(
    notifications: PushNotificationOptions[],
  ): Promise<PushDeliveryStatus[]> {
    const results: PushDeliveryStatus[] = [];

    for (const notification of notifications) {
      const result = await this.send(notification);
      results.push(result);

      // Small delay between notifications
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return results;
  }

  /**
   * Send silent push notification (for background sync)
   */
  async sendSilentNotification(
    userId: string,
    _data: Record<string, any>,
  ): Promise<PushDeliveryStatus> {
    this.fastify.log.info({ userId }, "Sending silent push notification");

    const tokens = await this.getUserDeviceTokens(userId);

    if (tokens.length === 0) {
      return {
        messageId: "",
        status: "failed",
        error: "No active device tokens",
        successCount: 0,
        failureCount: 0,
      };
    }

    // Not implemented (REV-027b/REV-028) — same FCM gap as sendViaFCM above.
    // Silent notifications don't show in the notification tray; they'd
    // trigger background app refresh, but nothing is actually sent.
    return {
      messageId: "",
      status: "failed",
      error: "FCM integration is not implemented (see REV-028)",
      successCount: 0,
      failureCount: tokens.length,
    };
  }
}

export function createPushNotificationService(
  fastify: FastifyInstance,
): PushNotificationService {
  return new PushNotificationService(fastify);
}
