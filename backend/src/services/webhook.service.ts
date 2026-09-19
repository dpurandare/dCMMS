/**
 * Webhook Notification Service (DCMMS-071)
 *
 * Features:
 * - Webhook delivery with HTTP POST
 * - HMAC-SHA256 signature verification (whenever a webhook has a secret)
 * - Retry logic (exponential backoff, in-memory)
 * - Delivery tracking and logging
 * - Timeout enforcement (default 10 seconds)
 *
 * Rewritten 2026-09-19 (REV-025b): the original version queried columns
 * (custom_headers, event_types, secret_key, timeout_seconds, max_retries,
 * active, request_url, response_status, attempt_number, next_retry_at, a
 * "retrying" delivery status, generate_webhook_secret()) that do not exist
 * anywhere in `db/schema.ts` or the database. Every call — including the two
 * live call sites in alert-notification-handler.service.ts and
 * notification.service.ts — has always failed at its first query and been
 * silently swallowed by their try/catch. This version matches the real
 * `webhooks` / `webhook_deliveries` tables. `timeoutSeconds`, `maxRetries`
 * and an optional `description` are not real columns on `webhooks`, so
 * they're packed into its `metadata` text column instead of being dropped.
 *
 * Configuration:
 *   WEBHOOK_TIMEOUT_MS=10000
 *   WEBHOOK_MAX_RETRIES=3
 */

import crypto from "crypto";
import axios, { AxiosResponse } from "axios";
import { pool } from "../db";

// ==========================================
// Types
// ==========================================

export interface WebhookConfig {
  id: string;
  url: string;
  authType: "none" | "bearer" | "basic" | "api_key";
  authToken?: string | null;
  authUsername?: string | null;
  authPassword?: string | null;
  headers?: Record<string, string>;
  secret?: string | null;
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
  deliveryId: string | null;
  status?: number;
  responseTime?: number;
  error?: string;
  attemptNumber: number;
}

type DeliveryStatus = "success" | "failed" | "timeout" | "invalid_response";

const DEFAULT_TIMEOUT_SECONDS = 10;
const DEFAULT_MAX_RETRIES = 3;
const RESPONSE_BODY_MAX_CHARS = 5000;

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
   * Send webhook notification. Delivery is logged in a single row once the
   * outcome is known — `webhook_delivery_status` has no "pending"/"retrying"
   * value, so there is nothing meaningful to write before the attempt
   * completes.
   */
  async sendWebhook(
    webhook: WebhookConfig,
    payload: WebhookPayload,
    attemptNumber: number = 1,
  ): Promise<WebhookDeliveryResult> {
    const startTime = Date.now();
    const requestBody = JSON.stringify(payload);
    const headers = this.buildHeaders(webhook, payload, requestBody);
    const timeoutMs =
      (webhook.timeoutSeconds || DEFAULT_TIMEOUT_SECONDS) * 1000;

    let response: AxiosResponse | undefined;
    let thrown: unknown = null;

    try {
      response = await axios.post(webhook.url, requestBody, {
        headers,
        timeout: timeoutMs,
      });
    } catch (error) {
      thrown = error;
    }

    const responseTime = Date.now() - startTime;
    const status = this.classifyStatus(thrown, response);
    const errorMessage = thrown
      ? this.getErrorMessage(thrown)
      : status === "invalid_response"
        ? `HTTP ${response!.status}: ${response!.statusText}`
        : undefined;

    const deliveryId = await this.recordDelivery(
      webhook.id,
      payload.eventType,
      requestBody,
      status,
      response?.status,
      response ? this.truncate(JSON.stringify(response.data)) : undefined,
      errorMessage,
      attemptNumber,
    );

    const success = status === "success";

    if (success) {
      console.log(
        `✓ Webhook delivered: ${webhook.url} (${response?.status}) in ${responseTime}ms`,
      );
    } else {
      console.error(
        `✗ Webhook ${status}: ${webhook.url} — ${errorMessage ?? "unknown error"}`,
      );
      const maxRetries = webhook.maxRetries ?? this.maxRetries;
      if (attemptNumber <= maxRetries) {
        this.scheduleRetry(webhook, payload, attemptNumber);
      }
    }

    return {
      success,
      deliveryId,
      status: response?.status,
      responseTime,
      error: errorMessage,
      attemptNumber,
    };
  }

  /**
   * Send to all webhooks registered for an event type
   */
  async triggerWebhooks(
    tenantId: string,
    eventType: string,
    eventData: Record<string, unknown>,
  ): Promise<WebhookDeliveryResult[]> {
    const webhooks = await this.getWebhooksForEvent(tenantId, eventType);

    if (webhooks.length === 0) {
      console.log(`No webhooks registered for event: ${eventType}`);
      return [];
    }

    console.log(
      `Triggering ${webhooks.length} webhook(s) for event: ${eventType}`,
    );

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

    return Promise.all(
      webhooks.map((webhook) => this.sendWebhook(webhook, payload)),
    );
  }

  /**
   * Classify the outcome of an attempt into the four values
   * `webhook_delivery_status` actually supports.
   */
  private classifyStatus(
    error: unknown,
    response?: AxiosResponse,
  ): DeliveryStatus {
    if (!error && response) {
      return response.status >= 200 && response.status < 300
        ? "success"
        : "invalid_response";
    }
    if (axios.isAxiosError(error) && error.code === "ECONNABORTED") {
      return "timeout";
    }
    return "failed";
  }

  /**
   * Build HTTP headers for webhook request. HMAC signing is applied
   * whenever the webhook has a secret, independent of `authType` — signing
   * proves payload authenticity, `authType` controls the Authorization
   * header, and `webhook_auth_type` has no "hmac" value.
   */
  private buildHeaders(
    webhook: WebhookConfig,
    payload: WebhookPayload,
    requestBody: string,
  ): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "dCMMS-Webhook/1.0",
      "X-Webhook-Event": payload.eventType,
      "X-Webhook-Timestamp": payload.timestamp,
      "X-Webhook-ID": crypto.randomUUID(),
    };

    if (webhook.authType === "bearer" && webhook.authToken) {
      headers["Authorization"] = `Bearer ${webhook.authToken}`;
    } else if (
      webhook.authType === "basic" &&
      webhook.authUsername &&
      webhook.authPassword
    ) {
      const creds = Buffer.from(
        `${webhook.authUsername}:${webhook.authPassword}`,
      ).toString("base64");
      headers["Authorization"] = `Basic ${creds}`;
    } else if (webhook.authType === "api_key" && webhook.authToken) {
      headers["X-Api-Key"] = webhook.authToken;
    }

    if (webhook.secret) {
      headers["X-Webhook-Signature"] = this.generateSignature(
        requestBody,
        webhook.secret,
      );
      headers["X-Webhook-Signature-Algorithm"] = "sha256";
    }

    if (webhook.headers) {
      Object.assign(headers, webhook.headers);
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
    const a = Buffer.from(signature);
    const b = Buffer.from(expectedSignature);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  /**
   * Get active webhooks subscribed to an event type. `events` is a text
   * column holding a JSON array (or the string "all"), not a Postgres
   * array, so subscription matching happens in JS after fetching.
   */
  private async getWebhooksForEvent(
    tenantId: string,
    eventType: string,
  ): Promise<WebhookConfig[]> {
    const result = await pool.query(
      `
      SELECT
        id,
        url,
        auth_type AS "authType",
        auth_token AS "authToken",
        auth_username AS "authUsername",
        auth_password AS "authPassword",
        headers,
        secret,
        metadata,
        events
      FROM webhooks
      WHERE tenant_id = $1 AND is_active = true
    `,
      [tenantId],
    );

    return result.rows
      .filter((row) => {
        let events: string[] = [];
        try {
          events = JSON.parse(row.events || "[]");
        } catch {
          events = [];
        }
        return events.includes(eventType) || events.includes("all");
      })
      .map((row) => this.toWebhookConfig(row));
  }

  private toWebhookConfig(row: {
    id: string;
    url: string;
    authType: string;
    authToken: string | null;
    authUsername: string | null;
    authPassword: string | null;
    headers: string | null;
    secret: string | null;
    metadata: string | null;
  }): WebhookConfig {
    let meta: { timeoutSeconds?: number; maxRetries?: number } = {};
    try {
      meta = JSON.parse(row.metadata || "{}");
    } catch {
      meta = {};
    }
    let headers: Record<string, string> | undefined;
    try {
      headers = row.headers ? JSON.parse(row.headers) : undefined;
    } catch {
      headers = undefined;
    }

    return {
      id: row.id,
      url: row.url,
      authType: row.authType as WebhookConfig["authType"],
      authToken: row.authToken,
      authUsername: row.authUsername,
      authPassword: row.authPassword,
      headers,
      secret: row.secret,
      timeoutSeconds: meta.timeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS,
      maxRetries: meta.maxRetries ?? DEFAULT_MAX_RETRIES,
    };
  }

  private truncate(value: string): string {
    return value.length > RESPONSE_BODY_MAX_CHARS
      ? value.slice(0, RESPONSE_BODY_MAX_CHARS)
      : value;
  }

  /**
   * Record a completed delivery attempt. Returns null (and logs a warning,
   * without throwing) if the insert fails — most likely because `eventType`
   * isn't one of the ten values `notification_event_type` allows. Losing an
   * audit row must never block the actual webhook delivery, which has
   * already happened by the time this is called.
   */
  private async recordDelivery(
    webhookId: string,
    eventType: string,
    payload: string,
    status: DeliveryStatus,
    statusCode?: number,
    responseBody?: string,
    errorMessage?: string,
    attemptCount: number = 1,
  ): Promise<string | null> {
    try {
      const result = await pool.query(
        `
        INSERT INTO webhook_deliveries (
          webhook_id, event_type, payload, status, status_code,
          response_body, error_message, attempt_count, sent_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING id
      `,
        [
          webhookId,
          eventType,
          payload,
          status,
          statusCode ?? null,
          responseBody ?? null,
          errorMessage ?? null,
          attemptCount,
        ],
      );
      return result.rows[0].id;
    } catch (error) {
      console.error(
        `Could not record webhook delivery for event "${eventType}" (likely outside the notification_event_type enum):`,
        error,
      );
      return null;
    }
  }

  /**
   * Get a readable error message from a failed delivery attempt
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
   * Schedule an in-memory retry with exponential backoff. There is no
   * "retrying" delivery status or `next_retry_at` column to persist this
   * to, matching the pattern already used elsewhere in this codebase
   * (e.g. notification-batching) — acceptable here because retries are
   * best-effort and each attempt still gets its own permanent delivery row.
   */
  private scheduleRetry(
    webhook: WebhookConfig,
    payload: WebhookPayload,
    attemptNumber: number,
  ): void {
    const delaySeconds = Math.pow(2, attemptNumber); // 2, 4, 8 seconds
    console.log(
      `Scheduling retry #${attemptNumber + 1} for webhook ${webhook.url} in ${delaySeconds}s`,
    );
    setTimeout(() => {
      this.sendWebhook(webhook, payload, attemptNumber + 1);
    }, delaySeconds * 1000);
  }
}

import { FastifyInstance } from "fastify";

export function createWebhookService(
  _fastify: FastifyInstance,
): WebhookService {
  return new WebhookService();
}

export default WebhookService;
