/**
 * Email Service
 *
 * Mock implementation for development/build without external dependencies.
 */

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: any[];
}

export interface EmailResult {
  status: 'sent' | 'failed';
  messageId?: string;
  error?: string;
}

export class EmailService {
  constructor() {
    console.log('Email Service initialized (Mock Provider)');
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    console.log(`[Mock Email] Sending email to ${options.to}: ${options.subject}`);
    return {
      status: 'sent',
      messageId: `mock-email-${Date.now()}`,
    };
  }
}

export default EmailService;
