import { FastifyInstance } from "fastify";

export interface SMSOptions {
  to: string;
  body: string;
}

export interface SMSDeliveryStatus {
  messageId: string;
  status: "sent" | "failed";
  error?: string;
  cost?: number;
}

/**
 * SMS Provider Service
 * Supports multiple providers: Twilio, AWS SNS
 */
export class SMSProviderService {
  private fastify: FastifyInstance;
  private provider: "twilio" | "sns" | "console";
  private fromNumber: string;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    this.provider = (process.env.SMS_PROVIDER as any) || "console";
    this.fromNumber = process.env.SMS_FROM_NUMBER || "+10000000000";
  }

  /**
   * Send SMS using configured provider
   */
  async send(options: SMSOptions): Promise<SMSDeliveryStatus> {
    const { to, body } = options;

    // Validate phone number
    if (!this.isValidPhoneNumber(to)) {
      throw new Error(`Invalid phone number: ${to}`);
    }

    // Validate message length (SMS should be < 160 chars)
    if (body.length > 160) {
      this.fastify.log.warn(
        { length: body.length },
        "SMS body exceeds 160 characters, may be split into multiple messages",
      );
    }

    this.fastify.log.info(
      { to, bodyLength: body.length, provider: this.provider },
      "Sending SMS",
    );

    try {
      switch (this.provider) {
        case "twilio":
          return await this.sendViaTwilio(to, body);
        case "sns":
          return await this.sendViaSNS(to, body);
        case "console":
        default:
          return await this.sendViaConsole(to, body);
      }
    } catch (error) {
      this.fastify.log.error({ error, to }, "Failed to send SMS");
      return {
        messageId: "",
        status: "failed",
        error: (error as Error).message,
      };
    }
  }

  /**
   * Send SMS via Twilio
   */
  private async sendViaTwilio(
    to: string,
    body: string,
  ): Promise<SMSDeliveryStatus> {
    try {
      // TODO: Implement Twilio integration
      // const twilio = require('twilio');
      // const client = twilio(
      //   process.env.TWILIO_ACCOUNT_SID,
      //   process.env.TWILIO_AUTH_TOKEN
      // );
      // const message = await client.messages.create({
      //   body,
      //   from: this.fromNumber,
      //   to,
      // });

      this.fastify.log.info({ to, body }, "[Twilio] SMS would be sent here");

      return {
        messageId: `twilio-${Date.now()}`,
        status: "sent",
        cost: 0.0075, // Approximate cost per SMS
      };
    } catch (error) {
      throw new Error(`Twilio error: ${(error as Error).message}`);
    }
  }

  /**
   * Send SMS via AWS SNS
   */
  private async sendViaSNS(
    to: string,
    body: string,
  ): Promise<SMSDeliveryStatus> {
    try {
      // TODO: Implement AWS SNS integration
      // const AWS = require('aws-sdk');
      // const sns = new AWS.SNS({
      //   region: process.env.AWS_REGION || 'us-east-1',
      // });
      // const params = {
      //   Message: body,
      //   PhoneNumber: to,
      //   MessageAttributes: {
      //     'AWS.SNS.SMS.SMSType': {
      //       DataType: 'String',
      //       StringValue: 'Transactional',
      //     },
      //   },
      // };
      // const result = await sns.publish(params).promise();

      this.fastify.log.info({ to, body }, "[AWS SNS] SMS would be sent here");

      return {
        messageId: `sns-${Date.now()}`,
        status: "sent",
        cost: 0.00645, // Approximate cost per SMS
      };
    } catch (error) {
      throw new Error(`AWS SNS error: ${(error as Error).message}`);
    }
  }

  /**
   * Console logger (for development/testing)
   */
  private async sendViaConsole(
    to: string,
    body: string,
  ): Promise<SMSDeliveryStatus> {
    console.log("\n" + "=".repeat(80));
    console.log("📱 SMS (Console Mode)");
    console.log("=".repeat(80));
    console.log(`From: ${this.fromNumber}`);
    console.log(`To: ${to}`);
    console.log(`Body: ${body}`);
    console.log(`Length: ${body.length} characters`);
    console.log("=".repeat(80) + "\n");

    return {
      messageId: `console-${Date.now()}`,
      status: "sent",
      cost: 0,
    };
  }

  /**
   * Validate phone number (E.164 format)
   */
  private isValidPhoneNumber(phone: string): boolean {
    // E.164 format: +[country code][number]
    // Example: +14155552671
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phone);
  }

  /**
   * Format phone number to E.164
   */
  static formatToE164(phone: string, countryCode: string = "1"): string {
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, "");

    // Add country code if not present
    if (!cleaned.startsWith(countryCode)) {
      return `+${countryCode}${cleaned}`;
    }

    return `+${cleaned}`;
  }

  /**
   * Check if user has opted out
   */
  async checkOptOut(_phoneNumber: string): Promise<boolean> {
    // TODO: Implement opt-out checking
    // Query database for opt-out list
    return false;
  }

  /**
   * Handle opt-out request (STOP keyword)
   */
  async handleOptOut(phoneNumber: string): Promise<void> {
    this.fastify.log.info(
      { phoneNumber },
      "User opted out of SMS notifications",
    );
    // TODO: Add to opt-out list in database
  }

  /**
   * Send bulk SMS (with rate limiting)
   */
  async sendBulk(messages: SMSOptions[]): Promise<SMSDeliveryStatus[]> {
    const results: SMSDeliveryStatus[] = [];

    // Send SMS in batches to respect rate limits
    const batchSize = 5;
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((msg) => this.send(msg)),
      );
      results.push(...batchResults);

      // Add delay between batches (Twilio rate limit: 1 message/second)
      if (i + batchSize < messages.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Get SMS cost tracking
   */
  async getCostSummary(results: SMSDeliveryStatus[]): Promise<{
    totalSent: number;
    totalFailed: number;
    totalCost: number;
  }> {
    const totalSent = results.filter((r) => r.status === "sent").length;
    const totalFailed = results.filter((r) => r.status === "failed").length;
    const totalCost = results
      .filter((r) => r.status === "sent")
      .reduce((sum, r) => sum + (r.cost || 0), 0);

    return {
      totalSent,
      totalFailed,
      totalCost,
    };
  }
}

export function createSMSProviderService(
  fastify: FastifyInstance,
): SMSProviderService {
  return new SMSProviderService(fastify);
}
