/**
 * SMS Notification Provider (DCMMS-065)
 *
 * Mock implementation for development/build without external dependencies.
 */

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

export class SMSService {
  constructor() {
    console.log("SMS service initialized (Mock Provider)");
  }

  async sendSMS(options: SMSOptions): Promise<SMSResult> {
    console.log(`[Mock SMS] To: ${options.to}, Body: ${options.body}`);
    return {
      success: true,
      messageId: "mock-sms-id-" + Date.now(),
      provider: "mock",
      cost: 0,
    };
  }

  async verifyConnection(): Promise<boolean> {
    return true;
  }

  async isOptedOut(_phone: string): Promise<boolean> {
    return false;
  }

  async handleOptOut(phone: string): Promise<void> {
    console.log(`[Mock SMS] Opt-out request from: ${phone}`);
  }
}

export default SMSService;
