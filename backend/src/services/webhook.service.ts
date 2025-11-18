import { FastifyInstance } from 'fastify';
import { db } from '../db';
import { webhooks, webhookDeliveries } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

export interface WebhookPayload {
  event: string;
  timestamp: string;
  tenantId: string;
  data: Record<string, any>;
}

export interface WebhookDeliveryResult {
  webhookId: string;
  status: 'success' | 'failed' | 'timeout' | 'invalid_response';
  statusCode?: number;
  responseBody?: string;
  errorMessage?: string;
}

/**
 * Webhook Service
 * Handles webhook delivery with retry logic and signature verification
 */
export class WebhookService {
  private fastify: FastifyInstance;
  private readonly MAX_RETRIES = 3;
  private readonly TIMEOUT_MS = 10000; // 10 seconds
  private readonly RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

  /**
   * Send webhook to all registered webhooks for an event
   */
  async sendWebhook(
    tenantId: string,
    eventType: string,
    data: Record<string, any>
  ): Promise<WebhookDeliveryResult[]> {
    this.fastify.log.info({ tenantId, eventType }, 'Sending webhooks for event');

    try {
      // Get all active webhooks for this tenant and event
      const tenantWebhooks = await db.query.webhooks.findMany({
        where: and(
          eq(webhooks.tenantId, tenantId),
          eq(webhooks.isActive, true)
        ),
      });

      // Filter webhooks that are subscribed to this event
      const subscribedWebhooks = tenantWebhooks.filter((webhook) => {
        const events = JSON.parse(webhook.events) as string[];
        return events.includes(eventType) || events.includes('*');
      });

      if (subscribedWebhooks.length === 0) {
        this.fastify.log.info({ tenantId, eventType }, 'No webhooks subscribed to this event');
        return [];
      }

      // Prepare payload
      const payload: WebhookPayload = {
        event: eventType,
        timestamp: new Date().toISOString(),
        tenantId,
        data,
      };

      // Send to all subscribed webhooks
      const results: WebhookDeliveryResult[] = [];
      for (const webhook of subscribedWebhooks) {
        const result = await this.deliverWebhook(webhook, payload);
        results.push(result);
      }

      return results;
    } catch (error) {
      this.fastify.log.error({ error, tenantId, eventType }, 'Failed to send webhooks');
      throw error;
    }
  }

  /**
   * Deliver webhook to a specific endpoint with retry logic
   */
  private async deliverWebhook(
    webhook: any,
    payload: WebhookPayload
  ): Promise<WebhookDeliveryResult> {
    const { id, url, authType, authToken, authUsername, authPassword, headers, secret } = webhook;

    this.fastify.log.info({ webhookId: id, url }, 'Delivering webhook');

    let lastError: any = null;
    let attemptCount = 0;

    // Try delivery with retries
    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      attemptCount = attempt + 1;

      try {
        // Add delay for retries (exponential backoff)
        if (attempt > 0) {
          const delay = this.RETRY_DELAYS[attempt - 1] || 4000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          this.fastify.log.info(
            { webhookId: id, attempt: attemptCount },
            'Retrying webhook delivery'
          );
        }

        // Make HTTP request
        const result = await this.makeWebhookRequest(webhook, payload);

        // Log successful delivery
        await this.logDelivery(id, payload.event, payload, result, attemptCount);

        return {
          webhookId: id,
          ...result,
        };
      } catch (error) {
        lastError = error;
        this.fastify.log.warn(
          { error, webhookId: id, attempt: attemptCount },
          'Webhook delivery attempt failed'
        );
      }
    }

    // All retries exhausted, log final failure
    const failureResult: WebhookDeliveryResult = {
      webhookId: id,
      status: 'failed',
      errorMessage: lastError?.message || 'Unknown error',
    };

    await this.logDelivery(id, payload.event, payload, failureResult, attemptCount);

    return failureResult;
  }

  /**
   * Make HTTP request to webhook endpoint
   */
  private async makeWebhookRequest(
    webhook: any,
    payload: WebhookPayload
  ): Promise<Omit<WebhookDeliveryResult, 'webhookId'>> {
    const { url, authType, authToken, authUsername, authPassword, headers: customHeaders, secret } = webhook;

    // Prepare headers
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'dCMMS-Webhook/1.0',
      ...JSON.parse(customHeaders || '{}'),
    };

    // Add authentication
    if (authType === 'bearer' && authToken) {
      requestHeaders['Authorization'] = `Bearer ${authToken}`;
    } else if (authType === 'basic' && authUsername && authPassword) {
      const credentials = Buffer.from(`${authUsername}:${authPassword}`).toString('base64');
      requestHeaders['Authorization'] = `Basic ${credentials}`;
    } else if (authType === 'api_key' && authToken) {
      requestHeaders['X-API-Key'] = authToken;
    }

    // Add HMAC signature for payload verification
    if (secret) {
      const signature = this.generateSignature(payload, secret);
      requestHeaders['X-Webhook-Signature'] = signature;
    }

    // Make request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const statusCode = response.status;
      const responseBody = await response.text().catch(() => '');

      // Check if response is successful (2xx)
      if (statusCode >= 200 && statusCode < 300) {
        return {
          status: 'success',
          statusCode,
          responseBody: responseBody.substring(0, 1000), // Limit response body size
        };
      } else {
        return {
          status: 'invalid_response',
          statusCode,
          responseBody: responseBody.substring(0, 1000),
          errorMessage: `HTTP ${statusCode}: ${response.statusText}`,
        };
      }
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        return {
          status: 'timeout',
          errorMessage: `Request timeout after ${this.TIMEOUT_MS}ms`,
        };
      }

      return {
        status: 'failed',
        errorMessage: error.message || 'Network error',
      };
    }
  }

  /**
   * Generate HMAC-SHA256 signature for payload
   */
  private generateSignature(payload: WebhookPayload, secret: string): string {
    const payloadString = JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payloadString);
    return `sha256=${hmac.digest('hex')}`;
  }

  /**
   * Verify webhook signature
   */
  static verifySignature(payload: string, signature: string, secret: string): boolean {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = `sha256=${hmac.digest('hex')}`;
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Log webhook delivery
   */
  private async logDelivery(
    webhookId: string,
    eventType: string,
    payload: WebhookPayload,
    result: Omit<WebhookDeliveryResult, 'webhookId'>,
    attemptCount: number
  ): Promise<void> {
    try {
      await db.insert(webhookDeliveries).values({
        webhookId,
        eventType: eventType as any,
        payload: JSON.stringify(payload),
        status: result.status,
        statusCode: result.statusCode,
        responseBody: result.responseBody,
        errorMessage: result.errorMessage,
        attemptCount,
        sentAt: new Date(),
      });

      this.fastify.log.info(
        {
          webhookId,
          eventType,
          status: result.status,
          attemptCount,
        },
        'Webhook delivery logged'
      );
    } catch (error) {
      this.fastify.log.error({ error, webhookId }, 'Failed to log webhook delivery');
    }
  }

  /**
   * Get webhook deliveries for a webhook
   */
  async getDeliveries(
    webhookId: string,
    options: { limit?: number; offset?: number } = {}
  ) {
    const { limit = 50, offset = 0 } = options;

    return db.query.webhookDeliveries.findMany({
      where: eq(webhookDeliveries.webhookId, webhookId),
      orderBy: (deliveries, { desc }) => [desc(deliveries.createdAt)],
      limit,
      offset,
    });
  }

  /**
   * Test webhook endpoint
   */
  async testWebhook(webhookId: string): Promise<WebhookDeliveryResult> {
    this.fastify.log.info({ webhookId }, 'Testing webhook');

    const webhook = await db.query.webhooks.findFirst({
      where: eq(webhooks.id, webhookId),
    });

    if (!webhook) {
      throw new Error('Webhook not found');
    }

    // Send test payload
    const testPayload: WebhookPayload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      tenantId: webhook.tenantId,
      data: {
        message: 'This is a test webhook from dCMMS',
        test: true,
      },
    };

    return this.deliverWebhook(webhook, testPayload);
  }

  /**
   * Cleanup old webhook deliveries (retention: 90 days)
   */
  async cleanupOldDeliveries(): Promise<number> {
    this.fastify.log.info('Cleaning up old webhook deliveries');

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    try {
      const result = await db
        .delete(webhookDeliveries)
        .where(
          // Delete deliveries older than 90 days
          eq(webhookDeliveries.createdAt, ninetyDaysAgo)
        )
        .returning();

      this.fastify.log.info({ count: result.length }, 'Cleaned up old webhook deliveries');
      return result.length;
    } catch (error) {
      this.fastify.log.error({ error }, 'Failed to cleanup old webhook deliveries');
      throw error;
    }
  }
}

export function createWebhookService(fastify: FastifyInstance): WebhookService {
  return new WebhookService(fastify);
}
