/**
 * Push Notification Provider (DCMMS-066)
 *
 * Firebase Cloud Messaging (FCM) for iOS and Android
 *
 * Features:
 * - Device token management
 * - Push notification delivery
 * - Deep linking
 * - Badge count management
 * - Silent notifications
 *
 * Configuration:
 *   FCM_PROJECT_ID=xxx
 *   FCM_PRIVATE_KEY=xxx
 *   FCM_CLIENT_EMAIL=xxx
 */

import admin from 'firebase-admin';

// ==========================================
// Types
// ==========================================

export interface PushOptions {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>; // Additional data payload
  imageUrl?: string;
  deepLink?: string; // e.g., '/work-orders/123'
  badge?: number;
  sound?: string;
  priority?: 'high' | 'normal';
  silent?: boolean;
}

export interface PushResult {
  success: boolean;
  messageId?: string;
  failureCount?: number;
  successCount?: number;
  error?: string;
}

// ==========================================
// Push Notification Service
// ==========================================

export class PushService {
  private initialized: boolean = false;

  constructor() {
    this.initializeFirebase();
  }

  /**
   * Initialize Firebase Admin SDK
   */
  private initializeFirebase() {
    try {
      if (admin.apps.length === 0) {
        const projectId = process.env.FCM_PROJECT_ID;
        const privateKey = process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n');
        const clientEmail = process.env.FCM_CLIENT_EMAIL;

        if (!projectId || !privateKey || !clientEmail) {
          console.warn('FCM configuration incomplete, push notifications disabled');
          return;
        }

        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            privateKey,
            clientEmail,
          }),
        });

        this.initialized = true;
        console.log('Firebase Cloud Messaging initialized');
      }
    } catch (error) {
      console.error('Failed to initialize FCM:', error);
    }
  }

  /**
   * Send push notification to user
   */
  async sendPush(options: PushOptions): Promise<PushResult> {
    if (!this.initialized) {
      return {
        success: false,
        error: 'Push notifications not configured',
      };
    }

    try {
      // Get user's device tokens from database
      const tokens = await this.getUserDeviceTokens(options.userId);

      if (tokens.length === 0) {
        return {
          success: false,
          error: 'No device tokens found for user',
        };
      }

      // Build notification payload
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: options.silent
          ? undefined
          : {
              title: options.title,
              body: options.body,
              imageUrl: options.imageUrl,
            },
        data: {
          ...options.data,
          deepLink: options.deepLink || '',
        },
        android: {
          priority: options.priority || 'high',
          notification: {
            sound: options.sound || 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: {
              badge: options.badge,
              sound: options.sound || 'default',
              contentAvailable: options.silent ? true : undefined,
            },
          },
        },
      };

      // Send to all devices
      const response = await admin.messaging().sendEachForMulticast(message);

      // Handle failed tokens (remove from database)
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(tokens[idx]);
            console.error(`Failed to send to token ${tokens[idx]}:`, resp.error);
          }
        });

        // Remove invalid tokens
        await this.removeDeviceTokens(options.userId, failedTokens);
      }

      return {
        success: response.successCount > 0,
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error: any) {
      console.error('Push notification error:', error);
      return {
        success: false,
        error: error.message || 'Unknown push error',
      };
    }
  }

  /**
   * Register device token for user
   */
  async registerDeviceToken(userId: string, token: string, platform: 'ios' | 'android'): Promise<void> {
    // TODO: Implement database insert
    // INSERT INTO user_device_tokens (user_id, token, platform) VALUES (userId, token, platform)
    // ON CONFLICT (user_id, token) DO UPDATE SET updated_at = NOW()
    console.log(`Registered device token for user ${userId}: ${token.substring(0, 20)}...`);
  }

  /**
   * Remove device token(s) for user
   */
  async removeDeviceTokens(userId: string, tokens: string[]): Promise<void> {
    // TODO: Implement database delete
    // DELETE FROM user_device_tokens WHERE user_id = userId AND token IN (tokens)
    console.log(`Removed ${tokens.length} invalid tokens for user ${userId}`);
  }

  /**
   * Get all device tokens for user
   */
  private async getUserDeviceTokens(userId: string): Promise<string[]> {
    // TODO: Implement database query
    // SELECT token FROM user_device_tokens WHERE user_id = userId AND active = true
    // For now, return empty array
    return [];
  }

  /**
   * Verify FCM connection
   */
  async verifyConnection(): Promise<boolean> {
    return this.initialized;
  }
}

export default PushService;
