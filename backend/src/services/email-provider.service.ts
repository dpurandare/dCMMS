import { FastifyInstance } from "fastify";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailDeliveryStatus {
  messageId: string;
  status: "sent" | "failed";
  error?: string;
}

/**
 * Email Provider Service
 * Supports multiple providers: SendGrid, AWS SES, SMTP
 */
export class EmailProviderService {
  private fastify: FastifyInstance;
  private provider: "sendgrid" | "ses" | "smtp" | "console";
  private fromEmail: string;
  private fromName: string;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    this.provider = (process.env.EMAIL_PROVIDER as any) || "console";
    this.fromEmail = process.env.EMAIL_FROM || "noreply@dcmms.local";
    this.fromName = process.env.EMAIL_FROM_NAME || "dCMMS System";
  }

  /**
   * Send email using configured provider
   */
  async send(options: EmailOptions): Promise<EmailDeliveryStatus> {
    const { to, subject, html, text } = options;

    this.fastify.log.info(
      { to, subject, provider: this.provider },
      "Sending email",
    );

    try {
      switch (this.provider) {
        case "sendgrid":
          return await this.sendViaSendGrid(to, subject, html, text);
        case "ses":
          return await this.sendViaSES(to, subject, html, text);
        case "smtp":
          return await this.sendViaSMTP(to, subject, html, text);
        case "console":
        default:
          return await this.sendViaConsole(to, subject, html, text);
      }
    } catch (error) {
      this.fastify.log.error({ error, to, subject }, "Failed to send email");
      return {
        messageId: "",
        status: "failed",
        error: (error as Error).message,
      };
    }
  }

  /**
   * Send email via SendGrid
   */
  private async sendViaSendGrid(
    to: string,
    subject: string,
    html: string,
    text?: string,
  ): Promise<EmailDeliveryStatus> {
    try {
      // TODO: Implement SendGrid integration
      // const sgMail = require('@sendgrid/mail');
      // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      // const msg = {
      //   to,
      //   from: { email: this.fromEmail, name: this.fromName },
      //   subject,
      //   html,
      //   text: text || this.stripHtml(html),
      // };
      // const [response] = await sgMail.send(msg);

      this.fastify.log.info(
        { to, subject },
        "[SendGrid] Email would be sent here",
      );

      return {
        messageId: `sendgrid-${Date.now()}`,
        status: "sent",
      };
    } catch (error) {
      throw new Error(`SendGrid error: ${(error as Error).message}`);
    }
  }

  /**
   * Send email via AWS SES
   */
  private async sendViaSES(
    to: string,
    subject: string,
    html: string,
    text?: string,
  ): Promise<EmailDeliveryStatus> {
    try {
      // TODO: Implement AWS SES integration
      // const AWS = require('aws-sdk');
      // const ses = new AWS.SES({
      //   region: process.env.AWS_REGION || 'us-east-1',
      // });
      // const params = {
      //   Source: `${this.fromName} <${this.fromEmail}>`,
      //   Destination: { ToAddresses: [to] },
      //   Message: {
      //     Subject: { Data: subject },
      //     Body: {
      //       Html: { Data: html },
      //       Text: { Data: text || this.stripHtml(html) },
      //     },
      //   },
      // };
      // const result = await ses.sendEmail(params).promise();

      this.fastify.log.info(
        { to, subject },
        "[AWS SES] Email would be sent here",
      );

      return {
        messageId: `ses-${Date.now()}`,
        status: "sent",
      };
    } catch (error) {
      throw new Error(`AWS SES error: ${(error as Error).message}`);
    }
  }

  /**
   * Send email via SMTP (using Nodemailer)
   */
  private async sendViaSMTP(
    to: string,
    subject: string,
    html: string,
    text?: string,
  ): Promise<EmailDeliveryStatus> {
    try {
      // TODO: Implement SMTP integration using Nodemailer
      // const nodemailer = require('nodemailer');
      // const transporter = nodemailer.createTransport({
      //   host: process.env.SMTP_HOST,
      //   port: parseInt(process.env.SMTP_PORT || '587'),
      //   secure: process.env.SMTP_SECURE === 'true',
      //   auth: {
      //     user: process.env.SMTP_USER,
      //     pass: process.env.SMTP_PASSWORD,
      //   },
      // });
      // const info = await transporter.sendMail({
      //   from: `${this.fromName} <${this.fromEmail}>`,
      //   to,
      //   subject,
      //   html,
      //   text: text || this.stripHtml(html),
      // });

      this.fastify.log.info({ to, subject }, "[SMTP] Email would be sent here");

      return {
        messageId: `smtp-${Date.now()}`,
        status: "sent",
      };
    } catch (error) {
      throw new Error(`SMTP error: ${(error as Error).message}`);
    }
  }

  /**
   * Console logger (for development/testing)
   */
  private async sendViaConsole(
    to: string,
    subject: string,
    html: string,
    text?: string,
  ): Promise<EmailDeliveryStatus> {
    console.log("\n" + "=".repeat(80));
    console.log("📧 EMAIL (Console Mode)");
    console.log("=".repeat(80));
    console.log(`From: ${this.fromName} <${this.fromEmail}>`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log("-".repeat(80));
    console.log("HTML Body:");
    console.log(html);
    console.log("=".repeat(80) + "\n");

    return {
      messageId: `console-${Date.now()}`,
      status: "sent",
    };
  }

  /**
   * Strip HTML tags for plain text version
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Validate email address
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Send bulk emails (with rate limiting)
   */
  async sendBulk(emails: EmailOptions[]): Promise<EmailDeliveryStatus[]> {
    const results: EmailDeliveryStatus[] = [];

    // Send emails in batches to respect rate limits
    const batchSize = 10;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((email) => this.send(email)),
      );
      results.push(...batchResults);

      // Add delay between batches
      if (i + batchSize < emails.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return results;
  }
}

export function createEmailProviderService(
  fastify: FastifyInstance,
): EmailProviderService {
  return new EmailProviderService(fastify);
}
