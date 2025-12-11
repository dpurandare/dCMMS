/**
 * Webhook Notification Service (DCMMS-071)
 *
 * Features:
 * - Webhook delivery with HTTP POST
 * - HMAC-SHA256 signature verification
 * - Retry logic (exponential backoff)
 * - Delivery tracking and logging
 * - Timeout enforcement (10 seconds)
 *
 * Configuration:
 *   WEBHOOK_TIMEOUT_MS=10000
 *   WEBHOOK_MAX_RETRIES=3
 */

import crypto from "crypto";
import axios from "axios";
import { pool } from "../db";

// ==========================================
// Types
// ==========================================

export interface WebhookConfig {
  id: string;
  url: string;
  authType: "none" | "bearer" | "basic" | "hmac";
  authToken?: string;
  customHeaders?: Record<string, string>;
  secretKey?: string;
  timeoutSeconds: number;
  maxRetries: number;
}

export interface WebhookPayload {
  event: string;
  eventType: string;
  timestamp: string;
  tenantId: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface WebhookDeliveryResult {
  success: boolean;
  deliveryId: string;
  status?: number;
  responseTime?: number;
  error?: string;
  attemptNumber: number;
}

// ==========================================
// Webhook Service
// ==========================================

export class WebhookService {
  private timeout: number;
  private maxRetries: number;

  constructor() {
    this.timeout = parseInt(process.env.WEBHOOK_TIMEOUT_MS || "10000");
    this.maxRetries = parseInt(process.env.WEBHOOK_MAX_RETRIES || "3");
  }

  /**
   * Trigger webhooks for an event
   */

  /**
   * Send webhook notification
   */
  async sendWebhook(
    webhook: WebhookConfig,
    payload: WebhookPayload,
    attemptNumber: number = 1,
  ): Promise<WebhookDeliveryResult> {
    const startTime = Date.now();

    try {
      // Build headers
      const headers = this.buildHeaders(webhook, payload);

      // Build request body
      const requestBody = JSON.stringify(payload);

      // Log delivery attempt
      const deliveryId = await this.logDeliveryAttempt(
        webhook.id,
        payload.eventType,
        payload.data,
        webhook.url,
        requestBody,
        attemptNumber,
      );

      // Send HTTP POST
      const response = await axios.post(webhook.url, requestBody, {
        headers,
        timeout: webhook.timeoutSeconds * 1000,
        validateStatus: () => true, // Don't throw on any status
      });

      const responseTime = Date.now() - startTime;

      // Check if successful (2xx status)
      const success = response.status >= 200 && response.status < 300;

      // Update delivery log
      await this.updateDeliveryLog(deliveryId, {
        status: success ? "success" : "failed",
        responseStatus: response.status,
        responseBody: JSON.stringify(response.data).substring(0, 10000), // Limit size
        responseTimeMs: responseTime,
        errorMessage: success
          ? null
          : `HTTP ${response.status}: ${response.statusText}`,
        completedAt: new Date(),
      });

      if (success) {
        console.log(
          `✓ Webhook delivered successfully: ${webhook.url} (${response.status}) in ${responseTime}ms`,
        );
        return {
          success: true,
          deliveryId,
          status: response.status,
          responseTime,
          attemptNumber,
        };
      } else {
        // Schedule retry if not max attempts
        if (attemptNumber < webhook.maxRetries) {
          await this.scheduleRetry(deliveryId, webhook, payload, attemptNumber);
          return {
            success: false,
            deliveryId,
            status: response.status,
            error: `HTTP ${response.status}, will retry`,
            attemptNumber,
          };
        } else {
          console.error(
            `✗ Webhook failed after ${attemptNumber} attempts: ${webhook.url} (${response.status})`,
          );
          return {
            success: false,
            deliveryId,
            status: response.status,
            error: `HTTP ${response.status}: ${response.statusText}`,
            attemptNumber,
          };
        }
      }
    } catch (error: unknown) {
      // const responseTime = Date.now() - startTime;
      const errorMessage = this.getErrorMessage(error);

      console.error(`✗ Webhook error: ${webhook.url} - ${errorMessage}`);

      // Log error (use existing deliveryId if available)
      const deliveryId = await this.logDeliveryAttempt(
        webhook.id,
        payload.eventType,
        payload.data,
        webhook.url,
        JSON.stringify(payload),
        attemptNumber,
        "failed",
        errorMessage,
      );

      // Schedule retry if not max attempts
      if (attemptNumber < webhook.maxRetries) {
        await this.scheduleRetry(deliveryId, webhook, payload, attemptNumber);
        return {
          success: false,
          deliveryId,
          error: `${errorMessage}, will retry`,
          attemptNumber,
        };
      } else {
        return {
          success: false,
          deliveryId,
          error: errorMessage,
          attemptNumber,
        };
      }
    }
  }

  /**
   * Send webhook to all registered webhooks for event type
   */
  async triggerWebhooks(
    tenantId: string,
    eventType: string,
    eventData: Record<string, unknown>,
  ): Promise<WebhookDeliveryResult[]> {
    // Get webhooks for this event type
    const webhooks = await this.getWebhooksForEvent(tenantId, eventType);

    if (webhooks.length === 0) {
      console.log(`No webhooks registered for event: ${eventType}`);
      return [];
    }

    console.log(
      `Triggering ${webhooks.length} webhook(s) for event: ${eventType}`,
    );

    // Build payload
    const payload: WebhookPayload = {
      event: `notification.${eventType}`,
      eventType,
      timestamp: new Date().toISOString(),
      tenantId,
      data: eventData,
      metadata: {
        source: "dCMMS",
        version: "1.0",
      },
    };

    // Send to all webhooks in parallel
    const results = await Promise.all(
      webhooks.map((webhook) => this.sendWebhook(webhook, payload)),
    );

    return results;
  }

  /**
   * Build HTTP headers for webhook request
   */
  private buildHeaders(
    webhook: WebhookConfig,
    payload: WebhookPayload,
  ): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "dCMMS-Webhook/1.0",
      "X-Webhook-Event": payload.eventType,
      "X-Webhook-Timestamp": payload.timestamp,
      "X-Webhook-ID": crypto.randomUUID(),
    };

    // Add authentication
    if (webhook.authType === "bearer" && webhook.authToken) {
      headers["Authorization"] = `Bearer ${webhook.authToken}`;
    } else if (webhook.authType === "basic" && webhook.authToken) {
      headers["Authorization"] = `Basic ${webhook.authToken}`;
    }

    // Add HMAC signature
    if (webhook.authType === "hmac" && webhook.secretKey) {
      const signature = this.generateSignature(
        JSON.stringify(payload),
        webhook.secretKey,
      );
      headers["X-Webhook-Signature"] = signature;
      headers["X-Webhook-Signature-Algorithm"] = "sha256";
    }

    // Add custom headers
    if (webhook.customHeaders) {
      Object.assign(headers, webhook.customHeaders);
    }

    return headers;
  }

  /**
   * Generate HMAC-SHA256 signature
   */
  private generateSignature(payload: string, secret: string): string {
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(payload);
    return `sha256=${hmac.digest("hex")}`;
  }

  /**
   * Verify HMAC signature (for incoming webhook verification)
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  }

  /**
   * Get webhooks for event type
   */
  private async getWebhooksForEvent(
    tenantId: string,
    eventType: string,
  ): Promise<WebhookConfig[]> {
    const result = await pool.query(
      `
      SELECT
        w.id,
        w.url,
        w.auth_type AS "authType",
        w.auth_token AS "authToken",
        w.custom_headers AS "customHeaders",
        w.secret_key AS "secretKey",
        w.timeout_seconds AS "timeoutSeconds",
        w.max_retries AS "maxRetries"
      FROM webhooks w
      WHERE w.tenant_id = $1
        AND w.active = true
        AND (
          $2 = ANY(w.event_types)
          OR 'all' = ANY(w.event_types)
        )
    `,
      [tenantId, eventType],
    );

    return result.rows;
  }

  /**
   * Log webhook delivery attempt
   */
  private async logDeliveryAttempt(
    webhookId: string,
    eventType: string,
    eventData: Record<string, unknown>,
    url: string,
    requestBody: string,
    attemptNumber: number,
    status: string = "pending",
    errorMessage?: string,
  ): Promise<string> {
    const result = await pool.query(
      `
      INSERT INTO webhook_deliveries (
        webhook_id,
        event_type,
        event_data,
        request_url,
        request_body,
        attempt_number,
        status,
        error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `,
      [
        webhookId,
        eventType,
        JSON.stringify(eventData),
        url,
        requestBody,
        attemptNumber,
        status,
        errorMessage || null,
      ],
    );

    return result.rows[0].id;
  }

  /**
   * Update delivery log
   */
  private async updateDeliveryLog(
    deliveryId: string,
    updates: {
      status?: string;
      responseStatus?: number;
      responseBody?: string;
      responseTimeMs?: number;
      errorMessage?: string | null;
      completedAt?: Date;
    },
  ): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (updates.status !== undefined) {
      fields.push(`status = $${paramCount++}`);
      values.push(updates.status);
    }
    if (updates.responseStatus !== undefined) {
      fields.push(`response_status = $${paramCount++}`);
      values.push(updates.responseStatus);
    }
    if (updates.responseBody !== undefined) {
      fields.push(`response_body = $${paramCount++}`);
      values.push(updates.responseBody);
    }
    if (updates.responseTimeMs !== undefined) {
      fields.push(`response_time_ms = $${paramCount++}`);
      values.push(updates.responseTimeMs);
    }
    if (updates.errorMessage !== undefined) {
      fields.push(`error_message = $${paramCount++}`);
      values.push(updates.errorMessage);
    }
    if (updates.completedAt !== undefined) {
      fields.push(`completed_at = $${paramCount++}`);
      values.push(updates.completedAt);
    }

    if (fields.length === 0) return;

    values.push(deliveryId);

    await pool.query(
      `
      UPDATE webhook_deliveries
      SET ${fields.join(", ")}
      WHERE id = $${paramCount}
    `,
      values,
    );
  }

  /**
   * Schedule retry with exponential backoff
   */
  private async scheduleRetry(
    deliveryId: string,
    webhook: WebhookConfig,
    payload: WebhookPayload,
    attemptNumber: number,
  ): Promise<void> {
    // Exponential backoff: 2^attempt seconds
    const delaySeconds = Math.pow(2, attemptNumber); // 2, 4, 8 seconds
    const nextRetryAt = new Date(Date.now() + delaySeconds * 1000);

    await pool.query(
      `
      UPDATE webhook_deliveries
      SET
        status = 'retrying',
        next_retry_at = $1
      WHERE id = $2
    `,
      [nextRetryAt, deliveryId],
    );

    console.log(
      `Scheduled retry #${attemptNumber + 1} for webhook ${webhook.url} in ${delaySeconds}s`,
    );

    // In production, this would be handled by a background worker
    // For now, schedule in-memory retry
    setTimeout(() => {
      this.sendWebhook(webhook, payload, attemptNumber + 1);
    }, delaySeconds * 1000);
  }

  /**
   * Get error message from axios error
   */
  private getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      if (error.code === "ECONNABORTED") {
        return "Request timeout";
      } else if (error.code === "ENOTFOUND") {
        return "DNS lookup failed";
      } else if (error.code === "ECONNREFUSED") {
        return "Connection refused";
      } else if (error.response) {
        return `HTTP ${error.response.status}: ${error.response.statusText}`;
      } else if (error.request) {
        return "No response received";
      }
    }
    return (error as Error).message || "Unknown error";
  }

  /**
   * Process pending retries
   * (Called by background worker)
   */
  async processRetries(): Promise<void> {
    const result = await pool.query(`
      SELECT
        wd.id AS delivery_id,
        wd.webhook_id,
        wd.event_type,
        wd.event_data,
        wd.attempt_number,
        w.url,
        w.auth_type AS "authType",
        w.auth_token AS "authToken",
        w.custom_headers AS "customHeaders",
        w.secret_key AS "secretKey",
        w.timeout_seconds AS "timeoutSeconds",
        w.max_retries AS "maxRetries"
      FROM webhook_deliveries wd
      INNER JOIN webhooks w ON wd.webhook_id = w.id
      WHERE wd.status = 'retrying'
        AND wd.next_retry_at <= NOW()
      LIMIT 100
    `);

    console.log(`Processing ${result.rows.length} webhook retries`);

    for (const row of result.rows) {
      const webhook: WebhookConfig = {
        id: row.webhook_id,
        url: row.url,
        authType: row.authType,
        authToken: row.authToken,
        customHeaders: row.customHeaders,
        secretKey: row.secretKey,
        timeoutSeconds: row.timeoutSeconds,
        maxRetries: row.maxRetries,
      };

      const payload: WebhookPayload = {
        event: `notification.${row.event_type}`,
        eventType: row.event_type,
        timestamp: new Date().toISOString(),
        tenantId: row.event_data.tenantId || "",
        data: row.event_data,
      };

      await this.sendWebhook(webhook, payload, row.attempt_number + 1);
    }
  }
}

import { FastifyInstance } from "fastify";

export function createWebhookService(
  _fastify: FastifyInstance,
): WebhookService {
  return new WebhookService();
}

export default WebhookService;
