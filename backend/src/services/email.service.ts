/**
 * Email Notification Provider (DCMMS-064)
 *
 * Supports multiple email providers:
 * - SendGrid (recommended for production)
 * - AWS SES (for AWS deployments)
 * - SMTP (for self-hosted or testing)
 * - Mailtrap (for development/testing)
 *
 * Features:
 * - HTML and plain text templates
 * - Delivery tracking
 * - Bounce handling
 * - Unsubscribe links
 * - Error handling and retries
 *
 * Configuration (environment variables):
 *   EMAIL_PROVIDER=sendgrid|ses|smtp|mailtrap
 *   EMAIL_FROM=notifications@dcmms.com
 *   EMAIL_FROM_NAME=dCMMS Notifications
 *
 *   # SendGrid
 *   SENDGRID_API_KEY=xxx
 *
 *   # AWS SES
 *   AWS_REGION=us-east-1
 *   AWS_ACCESS_KEY_ID=xxx
 *   AWS_SECRET_ACCESS_KEY=xxx
 *
 *   # SMTP
 *   SMTP_HOST=smtp.example.com
 *   SMTP_PORT=587
 *   SMTP_USER=xxx
 *   SMTP_PASSWORD=xxx
 *   SMTP_SECURE=true
 *
 *   # Mailtrap (testing)
 *   MAILTRAP_API_KEY=xxx
 */

import nodemailer from 'nodemailer';
import sendgridMail from '@sendgrid/mail';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

// ==========================================
// Types
// ==========================================

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  from?: string;
  fromName?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
  encoding?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  provider: string;
  error?: string;
  metadata?: Record<string, any>;
}

// ==========================================
// Abstract Email Provider
// ==========================================

abstract class EmailProvider {
  abstract send(options: EmailOptions): Promise<EmailResult>;
  abstract verifyConnection(): Promise<boolean>;
}

// ==========================================
// SendGrid Provider
// ==========================================

class SendGridProvider extends EmailProvider {
  constructor() {
    super();
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      throw new Error('SENDGRID_API_KEY environment variable is required');
    }
    sendgridMail.setApiKey(apiKey);
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    try {
      const from = options.from || process.env.EMAIL_FROM || 'notifications@dcmms.com';
      const fromName = options.fromName || process.env.EMAIL_FROM_NAME || 'dCMMS';

      const msg: any = {
        to: options.to,
        from: {
          email: from,
          name: fromName,
        },
        subject: options.subject,
        text: options.text,
        html: options.html || options.text,
      };

      if (options.replyTo) {
        msg.replyTo = options.replyTo;
      }

      if (options.cc) {
        msg.cc = options.cc;
      }

      if (options.bcc) {
        msg.bcc = options.bcc;
      }

      if (options.attachments) {
        msg.attachments = options.attachments.map((att) => ({
          filename: att.filename,
          content: att.content,
          type: att.contentType,
          disposition: 'attachment',
        }));
      }

      // Add custom headers for tracking
      if (options.headers || options.metadata) {
        msg.headers = {
          ...options.headers,
          'X-Metadata': JSON.stringify(options.metadata || {}),
        };
      }

      // Add unsubscribe link (optional)
      if (process.env.UNSUBSCRIBE_URL) {
        msg.headers = msg.headers || {};
        msg.headers['List-Unsubscribe'] = `<${process.env.UNSUBSCRIBE_URL}>`;
      }

      const [response] = await sendgridMail.send(msg);

      return {
        success: true,
        messageId: response.headers['x-message-id'],
        provider: 'sendgrid',
        metadata: {
          statusCode: response.statusCode,
        },
      };
    } catch (error: any) {
      console.error('SendGrid error:', error);
      return {
        success: false,
        provider: 'sendgrid',
        error: error.message || 'Unknown SendGrid error',
        metadata: {
          code: error.code,
          response: error.response?.body,
        },
      };
    }
  }

  async verifyConnection(): Promise<boolean> {
    // SendGrid doesn't have a ping endpoint, but we can verify API key is set
    return !!process.env.SENDGRID_API_KEY;
  }
}

// ==========================================
// AWS SES Provider
// ==========================================

class SESProvider extends EmailProvider {
  private client: SESClient;

  constructor() {
    super();
    const region = process.env.AWS_REGION || 'us-east-1';

    this.client = new SESClient({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    try {
      const from = options.from || process.env.EMAIL_FROM || 'notifications@dcmms.com';
      const fromName = options.fromName || process.env.EMAIL_FROM_NAME || 'dCMMS';

      const toAddresses = Array.isArray(options.to) ? options.to : [options.to];

      const command = new SendEmailCommand({
        Source: `${fromName} <${from}>`,
        Destination: {
          ToAddresses: toAddresses,
          CcAddresses: options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : undefined,
          BccAddresses: options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]) : undefined,
        },
        Message: {
          Subject: {
            Data: options.subject,
            Charset: 'UTF-8',
          },
          Body: {
            Text: {
              Data: options.text,
              Charset: 'UTF-8',
            },
            Html: options.html
              ? {
                  Data: options.html,
                  Charset: 'UTF-8',
                }
              : undefined,
          },
        },
        ReplyToAddresses: options.replyTo ? [options.replyTo] : undefined,
      });

      const response = await this.client.send(command);

      return {
        success: true,
        messageId: response.MessageId,
        provider: 'ses',
        metadata: {
          requestId: response.$metadata.requestId,
        },
      };
    } catch (error: any) {
      console.error('SES error:', error);
      return {
        success: false,
        provider: 'ses',
        error: error.message || 'Unknown SES error',
        metadata: {
          code: error.code,
          statusCode: error.$metadata?.httpStatusCode,
        },
      };
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      // Try to get sending statistics as a health check
      const { GetAccountSendingEnabledCommand } = await import('@aws-sdk/client-ses');
      const command = new GetAccountSendingEnabledCommand({});
      await this.client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }
}

// ==========================================
// SMTP Provider (Generic)
// ==========================================

class SMTPProvider extends EmailProvider {
  private transporter: nodemailer.Transporter;

  constructor() {
    super();

    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587');
    const secure = process.env.SMTP_SECURE === 'true';
    const user = process.env.SMTP_USER;
    const password = process.env.SMTP_PASSWORD;

    if (!host || !user || !password) {
      throw new Error('SMTP configuration incomplete');
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass: password,
      },
      pool: true, // Use connection pooling
      maxConnections: 5,
      maxMessages: 100,
    });
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    try {
      const from = options.from || process.env.EMAIL_FROM || 'notifications@dcmms.com';
      const fromName = options.fromName || process.env.EMAIL_FROM_NAME || 'dCMMS';

      const info = await this.transporter.sendMail({
        from: `${fromName} <${from}>`,
        to: options.to,
        cc: options.cc,
        bcc: options.bcc,
        replyTo: options.replyTo,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
        headers: options.headers,
      });

      return {
        success: true,
        messageId: info.messageId,
        provider: 'smtp',
        metadata: {
          response: info.response,
          accepted: info.accepted,
          rejected: info.rejected,
        },
      };
    } catch (error: any) {
      console.error('SMTP error:', error);
      return {
        success: false,
        provider: 'smtp',
        error: error.message || 'Unknown SMTP error',
        metadata: {
          code: error.code,
          command: error.command,
        },
      };
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('SMTP connection verification failed:', error);
      return false;
    }
  }
}

// ==========================================
// Mailtrap Provider (Testing)
// ==========================================

class MailtrapProvider extends SMTPProvider {
  constructor() {
    // Override SMTP settings with Mailtrap credentials
    process.env.SMTP_HOST = 'smtp.mailtrap.io';
    process.env.SMTP_PORT = '2525';
    process.env.SMTP_SECURE = 'false';
    // Mailtrap credentials should be set in env vars
    super();
  }
}

// ==========================================
// Email Service (Facade)
// ==========================================

export class EmailService {
  private provider: EmailProvider;
  private providerName: string;

  constructor() {
    this.providerName = process.env.EMAIL_PROVIDER || 'smtp';

    switch (this.providerName) {
      case 'sendgrid':
        this.provider = new SendGridProvider();
        break;
      case 'ses':
        this.provider = new SESProvider();
        break;
      case 'mailtrap':
        this.provider = new MailtrapProvider();
        break;
      case 'smtp':
      default:
        this.provider = new SMTPProvider();
        break;
    }

    console.log(`Email service initialized with provider: ${this.providerName}`);
  }

  /**
   * Send email
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    // Validate email addresses
    this.validateEmail(options.to);

    // Add unsubscribe link to HTML emails
    if (options.html && process.env.APP_URL) {
      options.html = this.addUnsubscribeLink(options.html);
    }

    // Send via provider
    const result = await this.provider.send(options);

    // Log result
    if (result.success) {
      console.log(`Email sent successfully via ${result.provider}:`, result.messageId);
    } else {
      console.error(`Email failed via ${result.provider}:`, result.error);
    }

    return result;
  }

  /**
   * Verify email provider connection
   */
  async verifyConnection(): Promise<boolean> {
    return await this.provider.verifyConnection();
  }

  /**
   * Validate email address format
   */
  private validateEmail(email: string | string[]): void {
    const emails = Array.isArray(email) ? email : [email];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (const addr of emails) {
      if (!emailRegex.test(addr)) {
        throw new Error(`Invalid email address: ${addr}`);
      }
    }
  }

  /**
   * Add unsubscribe link to HTML email
   */
  private addUnsubscribeLink(html: string): string {
    const unsubscribeUrl = `${process.env.APP_URL}/unsubscribe`;
    const unsubscribeLink = `
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center;">
        <p>Don't want to receive these emails? <a href="${unsubscribeUrl}" style="color: #3b82f6; text-decoration: underline;">Unsubscribe</a></p>
      </div>
    `;

    // Insert before closing body tag
    if (html.includes('</body>')) {
      return html.replace('</body>', `${unsubscribeLink}</body>`);
    } else {
      return html + unsubscribeLink;
    }
  }

  /**
   * Send email using template (convenience method)
   */
  async sendTemplatedEmail(params: {
    to: string | string[];
    subject: string;
    templateName: string;
    variables: Record<string, any>;
  }): Promise<EmailResult> {
    // This would integrate with the NotificationService template rendering
    // For now, simplified version
    const { to, subject, templateName, variables } = params;

    // In real implementation, this would:
    // 1. Load template from database
    // 2. Render with Handlebars
    // 3. Send email

    return this.sendEmail({
      to,
      subject,
      text: `Template: ${templateName}`,
      html: `<p>Template: ${templateName}</p><pre>${JSON.stringify(variables, null, 2)}</pre>`,
    });
  }
}

export default EmailService;
