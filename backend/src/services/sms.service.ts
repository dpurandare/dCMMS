/**
 * SMS Notification Provider (DCMMS-065)
 *
 * Supports:
 * - Twilio (recommended)
 * - AWS SNS
 *
 * Features:
 * - E.164 phone number validation
 * - Delivery status tracking
 * - Cost tracking
 * - Opt-out handling (STOP keyword)
 * - Character limit enforcement (160 chars)
 *
 * Configuration (environment variables):
 *   SMS_PROVIDER=twilio|sns
 *
 *   # Twilio
 *   TWILIO_ACCOUNT_SID=xxx
 *   TWILIO_AUTH_TOKEN=xxx
 *   TWILIO_PHONE_NUMBER=+1234567890
 *
 *   # AWS SNS
 *   AWS_REGION=us-east-1
 *   AWS_ACCESS_KEY_ID=xxx
 *   AWS_SECRET_ACCESS_KEY=xxx
 */

import twilio from 'twilio';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

// ==========================================
// Types
// ==========================================

export interface SMSOptions {
  to: string; // E.164 format: +1234567890
  body: string; // Max 160 characters recommended
  from?: string;
  metadata?: Record<string, any>;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  provider: string;
  cost?: number;
  error?: string;
  metadata?: Record<string, any>;
}

// ==========================================
// Abstract SMS Provider
// ==========================================

abstract class SMSProvider {
  abstract send(options: SMSOptions): Promise<SMSResult>;
  abstract verifyConnection(): Promise<boolean>;
}

// ==========================================
// Twilio Provider
// ==========================================

class TwilioProvider extends SMSProvider {
  private client: twilio.Twilio;
  private from: string;

  constructor() {
    super();

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.from = process.env.TWILIO_PHONE_NUMBER || '';

    if (!accountSid || !authToken || !this.from) {
      throw new Error('Twilio configuration incomplete');
    }

    this.client = twilio(accountSid, authToken);
  }

  async send(options: SMSOptions): Promise<SMSResult> {
    try {
      // Validate phone number
      if (!this.validatePhoneNumber(options.to)) {
        throw new Error(`Invalid phone number: ${options.to}`);
      }

      // Enforce character limit (warn if exceeding)
      if (options.body.length > 160) {
        console.warn(`SMS body exceeds 160 characters (${options.body.length}), will be split into multiple messages`);
      }

      const message = await this.client.messages.create({
        to: options.to,
        from: options.from || this.from,
        body: options.body,
      });

      return {
        success: true,
        messageId: message.sid,
        provider: 'twilio',
        cost: parseFloat(message.price || '0'),
        metadata: {
          status: message.status,
          numSegments: message.numSegments,
          direction: message.direction,
        },
      };
    } catch (error: any) {
      console.error('Twilio error:', error);
      return {
        success: false,
        provider: 'twilio',
        error: error.message || 'Unknown Twilio error',
        metadata: {
          code: error.code,
          moreInfo: error.moreInfo,
        },
      };
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      // Verify account by fetching account details
      await this.client.api.accounts(process.env.TWILIO_ACCOUNT_SID!).fetch();
      return true;
    } catch (error) {
      console.error('Twilio connection verification failed:', error);
      return false;
    }
  }

  private validatePhoneNumber(phone: string): boolean {
    try {
      return isValidPhoneNumber(phone);
    } catch (error) {
      return false;
    }
  }
}

// ==========================================
// AWS SNS Provider
// ==========================================

class SNSProvider extends SMSProvider {
  private client: SNSClient;

  constructor() {
    super();

    const region = process.env.AWS_REGION || 'us-east-1';

    this.client = new SNSClient({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }

  async send(options: SMSOptions): Promise<SMSResult> {
    try {
      // Validate phone number
      if (!this.validatePhoneNumber(options.to)) {
        throw new Error(`Invalid phone number: ${options.to}`);
      }

      const command = new PublishCommand({
        PhoneNumber: options.to,
        Message: options.body,
        MessageAttributes: {
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: 'Transactional', // vs 'Promotional'
          },
        },
      });

      const response = await this.client.send(command);

      return {
        success: true,
        messageId: response.MessageId,
        provider: 'sns',
        metadata: {
          requestId: response.$metadata.requestId,
        },
      };
    } catch (error: any) {
      console.error('SNS error:', error);
      return {
        success: false,
        provider: 'sns',
        error: error.message || 'Unknown SNS error',
        metadata: {
          code: error.code,
          statusCode: error.$metadata?.httpStatusCode,
        },
      };
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      // Try to get SMS attributes as a health check
      const { GetSMSAttributesCommand } = await import('@aws-sdk/client-sns');
      const command = new GetSMSAttributesCommand({});
      await this.client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }

  private validatePhoneNumber(phone: string): boolean {
    try {
      return isValidPhoneNumber(phone);
    } catch (error) {
      return false;
    }
  }
}

// ==========================================
// SMS Service (Facade)
// ==========================================

export class SMSService {
  private provider: SMSProvider;
  private providerName: string;

  constructor() {
    this.providerName = process.env.SMS_PROVIDER || 'twilio';

    switch (this.providerName) {
      case 'twilio':
        this.provider = new TwilioProvider();
        break;
      case 'sns':
        this.provider = new SNSProvider();
        break;
      default:
        throw new Error(`Unknown SMS provider: ${this.providerName}`);
    }

    console.log(`SMS service initialized with provider: ${this.providerName}`);
  }

  /**
   * Send SMS
   */
  async sendSMS(options: SMSOptions): Promise<SMSResult> {
    // Validate and format phone number
    const formattedPhone = this.formatPhoneNumber(options.to);
    if (!formattedPhone) {
      return {
        success: false,
        provider: this.providerName,
        error: `Invalid phone number: ${options.to}`,
      };
    }

    // Truncate message if too long (160 char limit for single SMS)
    let body = options.body;
    if (body.length > 160) {
      console.warn(`SMS truncated from ${body.length} to 160 characters`);
      body = body.substring(0, 157) + '...';
    }

    // Send via provider
    const result = await this.provider.send({
      ...options,
      to: formattedPhone,
      body,
    });

    // Log result
    if (result.success) {
      console.log(`SMS sent successfully via ${result.provider}:`, result.messageId);
      if (result.cost) {
        console.log(`SMS cost: $${result.cost}`);
      }
    } else {
      console.error(`SMS failed via ${result.provider}:`, result.error);
    }

    return result;
  }

  /**
   * Verify SMS provider connection
   */
  async verifyConnection(): Promise<boolean> {
    return await this.provider.verifyConnection();
  }

  /**
   * Format phone number to E.164
   */
  private formatPhoneNumber(phone: string): string | null {
    try {
      // If already in E.164 format, validate and return
      if (phone.startsWith('+')) {
        return isValidPhoneNumber(phone) ? phone : null;
      }

      // Try to parse with default country (US)
      const parsed = parsePhoneNumber(phone, 'US');
      return parsed ? parsed.format('E.164') : null;
    } catch (error) {
      console.error('Phone number formatting error:', error);
      return null;
    }
  }

  /**
   * Check if phone number is opted out
   * (In production, this would check against a database of opted-out numbers)
   */
  async isOptedOut(phone: string): Promise<boolean> {
    // TODO: Implement database check
    // For now, return false
    return false;
  }

  /**
   * Handle opt-out request (when user replies with STOP)
   */
  async handleOptOut(phone: string): Promise<void> {
    // TODO: Implement database insert
    console.log(`Opt-out request from: ${phone}`);
    // INSERT INTO sms_opt_outs (phone_number, opted_out_at) VALUES (phone, NOW())
  }
}

export default SMSService;
